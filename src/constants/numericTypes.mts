/** Literal numeric types - simplified to reduce type depth */

// Base ranges
type ZeroToTwo = 0 | 1 | 2;
type ZeroToThree = 0 | 1 | 2 | 3;
type ZeroToFour = 0 | 1 | 2 | 3 | 4;
type ZeroToFive = 0 | 1 | 2 | 3 | 4 | 5;
type ZeroToSix = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type ZeroToTen = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type ZeroToEleven = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

// Exclude zero variants
type OneToThree = 1 | 2 | 3;
type OneToFour = 1 | 2 | 3 | 4;
type OneToFive = 1 | 2 | 3 | 4 | 5;
type OneToSix = 1 | 2 | 3 | 4 | 5 | 6;
type OneToTen = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// Exclude first two variants
type TwoToThree = 2 | 3;

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
