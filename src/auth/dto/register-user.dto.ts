export interface RegisterUserDto {
  npm_atau_nip: string;
  password: string;
  nama: string;
  [key: string]: string | number | boolean;
}
