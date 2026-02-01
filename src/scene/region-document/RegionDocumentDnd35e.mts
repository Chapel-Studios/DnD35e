import type EmbeddedCollection from '@common/abstract/embedded-collection.mjs';
import { SpecificRegionBehavior } from '../region-behaviour/types.mjs';
import { SceneDnd35e } from '../SceneDnd35e.mjs';
// import type EmbeddedCollection from "@common/abstract/embedded-collection.d.mts";

class RegionDocumentDnd35e<TParent extends SceneDnd35e | null = SceneDnd35e | null> extends RegionDocument<TParent> {
  declare readonly object: foundry.canvas.placeables.Region<this>;
  declare readonly behaviors: EmbeddedCollection<SpecificRegionBehavior<this>>;

  /** Set an informal top-left coordinate pair from the coordinates minima of all embedded shapes. */
  get x (): number {
    return this.shapes.reduce((leftMost, shape) => {
      if ('x' in shape && typeof shape.x === 'number') {
        // rectangles and ellipses
        return shape.x < leftMost ? shape.x : leftMost;
      } else if ('points' in shape && Array.isArray(shape.points)) {
        // polygons
        return shape.points.find((p, index) => p < leftMost && index % 2 === 0) ?? leftMost;
      }
      return 0;
    }, canvas.dimensions.maxR);
  }

  get y (): number {
    return this.shapes.reduce((topMost, shape) => {
      if ('y' in shape && typeof shape.y === 'number') {
        return shape.y < topMost ? shape.y : topMost;
      } else if ('points' in shape && Array.isArray(shape.points)) {
        return shape.points.find((coord, index) => coord < topMost && index % 2 === 1) ?? topMost;
      }
      return 0;
    }, canvas.dimensions.maxR);
  }

  set x (value: number) {
    const difference = value - this.x;

    for (const shape of this.shapes) {
      if ('x' in shape && typeof shape.x === 'number') {
        shape.x += difference;
      } else if ('points' in shape && Array.isArray(shape.points)) {
        shape.points.forEach((coordinate, index) => {
          if (index % 2 === 0) {
            shape.points[index] = coordinate + difference;
          }
        });
      }
    }
  }

  set y (value: number) {
    const difference = value - this.y;

    for (const shape of this.shapes) {
      if ('y' in shape && typeof shape.y === 'number') {
        shape.y += difference;
      } else if ('points' in shape && Array.isArray(shape.points)) {
        shape.points.forEach((coordinate, index) => {
          if (index % 2 === 1) {
            shape.points[index] = coordinate + difference;
          }
        });
      }
    }
  }
};

export { RegionDocumentDnd35e };
