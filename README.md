# DynamicQueryFacetGenerator

Generates Facets dynamicaly based upon results from the index.

First the fields from the current index are retrieved (so that the component knows which fields are facets).
These fields are stored in localstorage (so it only happens once a week).

Second when a query is being executed, the facet cache is checked. If the query is in the cache the facets will be retrieved from cache.
If not, then a query is being executed against the index. The first number of results are being examined for facet values. If the treshold is met, and the distinct values are bigger then 1, the facet is added to the UI.

Another possibility is to use a push source query. This means: you must have a push source with QUERY + FACETS in them. This gives a bit better performance.

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

### Transform
There is a public transform method available to transform the fieldname into a title.

### Dictionary
The dictionary is used to transform the field name into a proper title.

### Blacklist
If certain facets should never be shown. Add them to the blacklist.


## Options

The following options can be configured:

| Option | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `queryToExecute` | No | string | `` | Query to execute to fetch the facet values. |
| `noOfResults` | No | number | `15` | How many results must be examines when checking for facet values. Recommendation: 15 |
| `noOfFacets` | No | number | `10` | How many facets must be added to the UI |
| `dependsOn` | No | string | `` | Which other facet does this component rely on. Only when this facet has a selection the facets will be added. |
| `useAdvancedQuery` | No | boolean | `false` | Must the advanced query (the facet selections) also be used to retrieve the facets. |
| `useOnlyUserFields` | No | boolean | `true` | When retrieving facet fields from the index. Only use 'User' defined fields. Else 'System' fields will also be used. |
| `usePush` | No | boolean | `false` | Use the Push approach (query the index on a specific push source). Make sure that the `queryToExecute` points to the push source. This will use the getValues of the defined facet (`pushGroupField`)|
| `usePushAsQuery` | No | boolean | `false` | Use the Push approach (but examine the query instead of using the getValues method) |
| `pushGroupField` | No | string |  | Field needed for the `usePush` method |
| `tresholdPercentage` | No | number | `30` | A facet is only considered if it is present on `tresholdPercentage`% of the results |
| `blacklist` | No | string | `field1,field2,field3` | The fields which should not be added to the UI |
| `dictionary` | No | string | `` | See above for instructions |


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