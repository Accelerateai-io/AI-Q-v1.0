declare module "bcrypt" {
  function hash(s: string, rounds: number): Promise<string>;
  function compare(plain: string, hashed: string): Promise<boolean>;
  function hashSync(s: string, rounds: number): string;
  function compareSync(plain: string, hashed: string): boolean;
  export { hash, compare, hashSync, compareSync };
  const bcrypt: { hash: typeof hash; compare: typeof compare; hashSync: typeof hashSync; compareSync: typeof compareSync };
  export default bcrypt;
}
