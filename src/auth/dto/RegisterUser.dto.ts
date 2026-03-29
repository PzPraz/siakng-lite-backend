export interface RegisterUser {
  npm_atau_nip: string;
  password: string;
  nama: string;
  [key: string]: string | number | boolean;
}
