// @ts-nocheck

export const disposeMaterial = (material) => {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }
  Object.values(material).forEach((value) => {
    if (value && typeof value.dispose === "function" && value.isTexture) value.dispose();
  });
  material.dispose?.();
};

export const disposeObjectTree = (root) => {
  root.traverse?.((obj) => {
    obj.geometry?.dispose?.();
    disposeMaterial(obj.material);
  });
};
