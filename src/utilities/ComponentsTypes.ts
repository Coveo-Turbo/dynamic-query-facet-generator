import { Component, DynamicHierarchicalFacet, DynamicFacet } from 'coveo-search-ui';
import { map } from 'underscore';

export interface IComponentsTypesSearchInterface {
  getComponents: (type: string) => Component[];
}

export class ComponentsTypes {
  static get allFacetsType() {
    return [DynamicFacet, DynamicHierarchicalFacet];
  }

  static get allFacetsTypeString() {
    return ComponentsTypes.allFacetsType.map((type) => type.ID);
  }

  static get allFacetsClassname() {
    return ComponentsTypes.allFacetsTypeString.map((type) => `Coveo${type}`);
  }

  static getAllFacetElementsFromElement(root: HTMLElement) {
    const selectors = ComponentsTypes.allFacetsClassname.map((className) => `.${className}`).join(', ');
    return root.querySelectorAll(selectors);
  }

  static getAllFacetInstancesFromElement(root: HTMLElement) {
    return map(ComponentsTypes.getAllFacetElementsFromElement(root), (element: HTMLElement) => Component.get(element) as Component);
  }
}
