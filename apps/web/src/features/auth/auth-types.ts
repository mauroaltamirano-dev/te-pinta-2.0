export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
};
