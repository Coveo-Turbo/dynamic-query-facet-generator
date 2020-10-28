# DynamicQueryFacetGenerator

Generates Facets dynamicaly based upon results from the index

Disclaimer: This component was built by the community at large and is not an official Coveo JSUI Component. Use this component at your own risk.


## Getting Started

1. Install the component into your project.

```
npm i @coveops/dynamic-query-facet-generator
```

2. Use the Component or extend it

Typescript:

```javascript
import { DynamicQueryFacetGenerator, IDynamicQueryFacetGeneratorOptions } from '@coveops/dynamic-query-facet-generator';
```

Javascript

```javascript
const DynamicQueryFacetGenerator = require('@coveops/dynamic-query-facet-generator').DynamicQueryFacetGenerator;
```
 
3. You can also expose the component alongside other components being built in your project.

```javascript
export * from '@coveops/dynamic-query-facet-generator'
```

4. Include the component in your template as follows:

Place the component in your markup:

```html
<div class="CoveoDynamicQueryFacetGenerator"></div>
```

## Usage

Add the `CoveoDynamicQueryFacetGenerator` along with the rest of the Facets.

```html
<div class="coveo-facet-column">
  <div class="CoveoDynamicFacetManager">
    <div class="CoveoDynamicFacet" data-field="@prd_brand" data-title="Brand"></div>
    <div class="CoveoDynamicFacet" data-field="@prd_category" data-title="Category Type"></div>
    <div class="CoveoDynamicQueryFacetGenerator" data-depends-on="@prd_category"></div>
  </div>
</div>
```

Before you initialize the UI, make sure you pass the facet fields dictionary to the DynamicQueryFacetGenerator component

```javascript
document.addEventListener('DOMContentLoaded', function () {
  Coveo.SearchEndpoint.configureSampleEndpointV2();
  Coveo.init(document.body, {
    DynamicQueryFacetGenerator: {
      dictionary: {
        "computer": "Computer Name",
        "phone": "Phone"
      },
      queryToExecute: "@source==BBQs",
      noOfResults: 25
    }
  });
})
```

### Dictionary
The dictionary is a translation table between fieldnames and titles to use.
"fieldname":"title"

## Extending

Extending the component can be done as follows:

```javascript
import { DynamicQueryFacetGenerator, IDynamicQueryFacetGeneratorOptions } from "@coveops/dynamic-query-facet-generator";

export interface IExtendedDynamicQueryFacetGeneratorOptions extends IDynamicQueryFacetGeneratorOptions {}

export class ExtendedDynamicQueryFacetGenerator extends DynamicQueryFacetGenerator {}
```

## Contribute

1. Clone the project
2. Copy `.env.dist` to `.env` and update the COVEO_ORG_ID and COVEO_TOKEN fields in the `.env` file to use your Coveo credentials and SERVER_PORT to configure the port of the sandbox - it will use 8080 by default.
3. Build the code base: `npm run build`
4. Serve the sandbox for live development `npm run serve`