import { computeTargetDimensions } from '../image-compression';

describe('computeTargetDimensions', () => {
  it('scales down a landscape image so the longer side is at most maxDimension', () => {
    expect(computeTargetDimensions(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('scales down a portrait image so the longer side is at most maxDimension', () => {
    expect(computeTargetDimensions(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('does not upscale an image already smaller than maxDimension', () => {
    expect(computeTargetDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('leaves a square image at the same dimensions when already within the limit', () => {
    expect(computeTargetDimensions(500, 500, 1600)).toEqual({ width: 500, height: 500 });
  });

  it('scales a square image down to maxDimension when larger', () => {
    expect(computeTargetDimensions(3000, 3000, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it('defaults maxDimension to 1600 when not provided', () => {
    expect(computeTargetDimensions(3200, 1600)).toEqual({ width: 1600, height: 800 });
  });
});
