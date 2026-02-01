/** Literal numeric types */
type ZeroToTwo = 0 | 1 | 2;
type ZeroToThree = ZeroToTwo | 3; // +1!
type OneToThree = Exclude<ZeroToThree, 0>;
type TwoToThree = Exclude<OneToThree, 1>;
type ZeroToFour = ZeroToThree | 4;
type OneToFour = Exclude<ZeroToFour, 0>;
type ZeroToFive = ZeroToFour | 5;
type OneToFive = OneToFour | Extract<ZeroToFive, 5>;
type ZeroToSix = ZeroToFive | 6;
type OneToSix = Exclude<ZeroToSix, 0>;
type ZeroToTen = ZeroToFive | 6 | 7 | 8 | 9 | 10;
type OneToTen = Exclude<ZeroToTen, 0>;
type ZeroToEleven = ZeroToTen | 11;

export type {
  ZeroToTwo,
  ZeroToThree,
  OneToThree,
  TwoToThree,
  ZeroToFour,
  OneToFour,
  ZeroToFive,
  OneToFive,
  ZeroToSix,
  OneToSix,
  ZeroToTen,
  OneToTen,
  ZeroToEleven,
};
