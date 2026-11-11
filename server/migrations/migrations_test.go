package migrations

import (
	"strings"
	"testing"
)

func TestEmbeddedMigrations(t *testing.T) {
	entries, err := FS.ReadDir(".")
	if err != nil {
		t.Fatalf("failed to read embedded dir: %v", err)
	}

	foundUp := false
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name(), ".up.sql") {
			foundUp = true
			content, err := FS.ReadFile(entry.Name())
			if err != nil {
				t.Fatalf("failed to read %s: %v", entry.Name(), err)
			}
			if len(content) == 0 {
				t.Fatalf("file %s is empty", entry.Name())
			}
		}
	}

	if !foundUp {
		t.Fatal("expected at least one .up.sql file in embedded migrations")
	}
}
