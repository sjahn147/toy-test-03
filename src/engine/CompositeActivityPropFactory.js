import { ActivityPropFactory } from './ActivityPropFactory.js';
import { OperationsPropFactory } from './OperationsPropFactory.js';

export class CompositeActivityPropFactory {
  constructor() {
    this.factories = [new OperationsPropFactory(), new ActivityPropFactory()];
  }

  create(activity, agent) {
    for (const factory of this.factories) {
      const mesh = factory.create(activity, agent);
      if (mesh) {
        mesh.userData.activityFactory = factory;
        return mesh;
      }
    }
    return null;
  }

  animate(root, activity, time) {
    root?.userData?.activityFactory?.animate?.(root, activity, time);
  }
}
