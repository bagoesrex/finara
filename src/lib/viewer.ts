export type Viewer = {
  id: string;
  name: string;
  email: string;
};

export type PrivateAppState =
  | { status: "signed-out" }
  | { status: "needs-onboarding"; viewer: Viewer }
  | { status: "ready"; viewer: Viewer };
