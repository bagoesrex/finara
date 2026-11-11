package ai_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"finara/server/internal/ai"
)

func TestClient_CompleteChat_Success(t *testing.T) {
	expectedResponse := `{"amount": 25000, "type": "EXPENSE", "category_id": "c-1", "account_id": "a-1", "description": "Makan padang", "transaction_date": "2026-11-12"}`

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Errorf("unexpected path: %s", r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
			return
		}

		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Errorf("missing or invalid authorization header: %s", r.Header.Get("Authorization"))
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("missing or invalid content-type: %s", r.Header.Get("Content-Type"))
		}

		var req ai.ChatCompletionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Errorf("failed to decode request body: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		if req.Model != "test-model" {
			t.Errorf("expected model 'test-model', got '%s'", req.Model)
		}
		if req.Temperature != 0 {
			t.Errorf("expected temperature 0, got %v", req.Temperature)
		}
		if req.MaxTokens != 512 {
			t.Errorf("expected max_tokens 512, got %v", req.MaxTokens)
		}
		if req.Stream != false {
			t.Errorf("expected stream false, got %v", req.Stream)
		}
		if req.ResponseFormat.Type != "json_object" {
			t.Errorf("expected response_format json_object, got %v", req.ResponseFormat.Type)
		}
		if len(req.Messages) != 2 {
			t.Errorf("expected 2 messages, got %d", len(req.Messages))
		}

		resp := ai.ChatCompletionResponse{
			Choices: []struct {
				Message struct {
					Role    string `json:"role"`
					Content string `json:"content"`
				} `json:"message"`
			}{
				{
					Message: struct {
						Role    string `json:"role"`
						Content string `json:"content"`
					}{
						Role:    "assistant",
						Content: expectedResponse,
					},
				},
			},
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer ts.Close()

	client := ai.NewClient(ai.ClientConfig{
		BaseURL:        ts.URL,
		APIKey:         "test-key",
		Model:          "test-model",
		TimeoutSeconds: 5,
	})

	content, err := client.CompleteChat(context.Background(), "You are an assistant", "makan padang 25rb")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if content != expectedResponse {
		t.Errorf("expected content %q, got %q", expectedResponse, content)
	}
}

func TestClient_CompleteChat_Errors(t *testing.T) {
	t.Run("upstream 500 error", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"error": {"message": "internal server error"}}`))
		}))
		defer ts.Close()

		client := ai.NewClient(ai.ClientConfig{
			BaseURL: ts.URL,
		})

		_, err := client.CompleteChat(context.Background(), "sys", "prompt")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("empty choices", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"choices": []}`))
		}))
		defer ts.Close()

		client := ai.NewClient(ai.ClientConfig{
			BaseURL: ts.URL,
		})

		_, err := client.CompleteChat(context.Background(), "sys", "prompt")
		if err == nil {
			t.Fatal("expected error on empty choices, got nil")
		}
	})

	t.Run("empty content", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"choices": [{"message": {"role": "assistant", "content": ""}}]}`))
		}))
		defer ts.Close()

		client := ai.NewClient(ai.ClientConfig{
			BaseURL: ts.URL,
		})

		_, err := client.CompleteChat(context.Background(), "sys", "prompt")
		if err == nil {
			t.Fatal("expected error on empty content, got nil")
		}
	})

	t.Run("timeout handled", func(t *testing.T) {
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			time.Sleep(100 * time.Millisecond)
			_, _ = w.Write([]byte(`{"choices": [{"message": {"role": "assistant", "content": "ok"}}]}`))
		}))
		defer ts.Close()

		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
		defer cancel()

		client := ai.NewClient(ai.ClientConfig{
			BaseURL:        ts.URL,
			TimeoutSeconds: 1,
		})

		_, err := client.CompleteChat(ctx, "sys", "prompt")
		if err == nil {
			t.Fatal("expected timeout error, got nil")
		}
	})
}
