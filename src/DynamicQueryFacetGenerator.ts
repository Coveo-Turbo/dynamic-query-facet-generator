import {
  Component,
  ComponentOptions,
  IComponentBindings,
  QueryEvents,
  IBuildingQueryEventArgs,
  DynamicFacet,
  $$,
  IFieldOption,
  get,
  DynamicHierarchicalFacet,
  LocalStorageUtils,
  QueryStateModel,
  IQueryResult,
  ResultPreviewsManager,
  Utils,
  IDoneBuildingQueryEventArgs,
  ExpressionBuilder,
  IQuerySuccessEventArgs,
  IDependsOnCompatibleFacet,
} from 'coveo-search-ui';
import { last, isFunction } from 'underscore';
import { ComponentsTypes } from './utilities/ComponentsTypes';
import { CustomEvents } from './events/CustomEvents';
import { UrlUtils } from './utilities/UrlUtils';

import { lazyComponent } from '@coveops/turbo-core';

export interface IQueryFacetDictionary {
  [value: string]: string;
}

class FacetList {
  facet: string;
  occurences: number;
  values: string[];
}

class CacheList {
  query: string;
  facets: string;
}

export interface IQueryFacetTransformArgs {
  facetTitle: string;
  field: string;
}

export interface IDynamicQueryFacetGeneratorOptions {
  queryToExecute?: string;
  noOfResults?: number;
  noOfFacets?: number;
  dependsOn?: string;
  useAdvancedQuery?: boolean;
  useOnlyUserFields?: boolean;
  usePush?: boolean;
  usePushAsQuery?: boolean;
  pushGroupField?: string;
  tresholdPercentage?: number;
  blacklist?: string;
  dictionary?: IQueryFacetDictionary;
}

@lazyComponent
/**
 * Dynamically generates facets when a condition is met
 *
 * @export
 * @class DynamicFacetGenerator
 * @extends {Component}
 * @implements {IComponentBindings}
 */
export class DynamicQueryFacetGenerator extends Component implements IComponentBindings {
  static ID = 'DynamicQueryFacetGenerator';

  private dictionary: IQueryFacetDictionary = null;
  private myCache: CacheList[];
  private allFields: string[];
  private previousQuery: string;
  private previousState: string;
  private currentFacets: string[];
  private cacheFacets: {};
  private blacklisted: string[];
  private gotFacets: boolean;
  private start: Date;
  private startQ: Date;
  private endQ: Date;
  private record: boolean;
  private comment: string;
  private querytime: string;
  private previousSelectedCategory: string = null;
  private localStorage: LocalStorageUtils<{ [caption: string]: string }>;
  private localStorageFields: LocalStorageUtils<{ fields: string[], expDate: string }>;

  static options: IDynamicQueryFacetGeneratorOptions = {
    /**
     * Specifies a dictionary with
     * To specify the parent facet, use its id.
     */
    dictionary: ComponentOptions.buildJsonOption(),
    /**
     * Specifies whether this facet only appears when a value is selected in its "parent" facet.
     * To specify the parent facet, use its id.
     */
    dependsOn: ComponentOptions.buildStringOption<string>(),
    /**
     * Query filter to execute to get the Facet Values
     */
    queryToExecute: ComponentOptions.buildStringOption({ defaultValue: '' }),
    /**
     * blacklist, do not use the fields in this list
     */
    blacklist: ComponentOptions.buildStringOption({ defaultValue: '' }),
    /**
     * useAdvancedQuery, trigger on AdvancedQuery
     */
    useAdvancedQuery: ComponentOptions.buildBooleanOption({ defaultValue: false }),
    /**
     * usePush, if a push source must be used instead of checking all the results
     */
    usePush: ComponentOptions.buildBooleanOption({ defaultValue: false }),
    /**
     * useOnlyUserFields, if you only want to use User Fields
     */
    useOnlyUserFields: ComponentOptions.buildBooleanOption({ defaultValue: true }),

    /**
     * usePushAsQuery, if the push should retrieve results instead of listFieldValues
     */
    usePushAsQuery: ComponentOptions.buildBooleanOption({ defaultValue: false }),
    /**
     * pushGroupField, field to get the values from when using usePush
     */
    pushGroupField: ComponentOptions.buildStringOption<string>(),
   
    /**
     * noOfResults to retrieve when fetching the facet values
     */
    noOfResults: ComponentOptions.buildNumberOption({ defaultValue: 25 }),
    /**
     * treshold percentage of the results which should minimal have the field
     */
    tresholdPercentage: ComponentOptions.buildNumberOption({ defaultValue: 30 }),
    /**
     * noOfFacets to retrieve when fetching the facet values
     */
    noOfFacets: ComponentOptions.buildNumberOption({ defaultValue: 10 }),

  };

  /**
   * Creates a new `Fleetpride` component.
   * @param element The HTMLElement on which to instantiate the component.
   * @param options The options for the `ResultList` component.
   * @param bindings The bindings that the component requires to function normally. If not set, these will be
   * automatically resolved (with a slower execution time).
   */
  constructor(public element: HTMLElement, public options: IDynamicQueryFacetGeneratorOptions, public bindings: IComponentBindings) {
    super(element, DynamicQueryFacetGenerator.ID, bindings);
    this.options = ComponentOptions.initComponentOptions(element, DynamicQueryFacetGenerator, options);
    this.previousQuery = '';
    this.myCache = [];
    this.cacheFacets = {};
    this.previousState = '';
    this.gotFacets = false;
    this.blacklisted = this.options.blacklist.split(',');
    this.bind.onRootElement(QueryEvents.buildingQuery, (args: IBuildingQueryEventArgs) => this.handleBuildingQuery(args));
    this.bind.onRootElement(QueryEvents.querySuccess, (arg: IQuerySuccessEventArgs) => this.handleQuery(arg));
    this.init();
  }

  updateDictionary(dictionary: IQueryFacetDictionary) {
    this.dictionary = dictionary;
  }

  private handleQuery(args: IQuerySuccessEventArgs) {
    if (this.record) {
      if (!args.searchAsYouType) {
        let end = new Date();
        let div = $$('div');
        let time = '<hr>Timer (ALL)             => ' + (end.getTime() - this.start.getTime()) + "<BR>";
        if (this.endQ != undefined && this.comment == '') {
          time += 'Timer (ParsingResults)  => ' + (this.endQ.getTime() - this.startQ.getTime()) + "<BR>";
          time += 'Timer (Re-Execute)      => ' + (end.getTime() - this.endQ.getTime()) + "<BR>";
        }
        time = time + this.comment;
        time = time + "Duration Facets Query => " + this.querytime;
        if (args.results['index'] == 'cache') {
          time = time + "<BR>FROM CACHE";
        }
        console.log(time);
        div.el.innerHTML = time + '<br>';
        this.element.prepend(div.el);
      }
    }
  }
  /**
   * Clears all current Dynamic Facets that have generated by this component
   *
   */
  clearGeneratedFacet() {
    if (this.element.children) {
      let rescueCounter = 1000; // In case it goes into an infinite loop. It is unlikely, but just in case...
      while (this.element.firstChild && rescueCounter > 0) {
        rescueCounter--;
        const child = this.element.firstChild as HTMLElement;
        if (child) {
          const facet = get(child, 'DynamicFacet') as DynamicFacet;
          if (facet) {
            // Disabling the Facet
            facet.disable();
            // Removing the Facet element from the DOM
            this.element.removeChild(child);
            const existingFacet: DynamicFacet[] = this.componentStateModel.attributes[QueryStateModel.getFacetId(facet.options.id)];
            if (existingFacet && existingFacet.length) {
              // Even if we disable the Facet component and remove the HTML element form the DOM, it will continue to exist in the componentStateModel. So we need to manually remove it from the state.
              this.componentStateModel.attributes[QueryStateModel.getFacetId(facet.options.id)] = [];
            }
          } else {
            this.element.removeChild(child);
          }
        }
      }
    }
  }

  private init() {
    // First check if a dictionnary has been passed as an option
    this.dictionary = this.options.dictionary;
    if (this.allFields == null) {
      //Get the facet fields from the index
      this.initLocalStorageFields();
      this.loadFieldsFromIndex();
    }
  }

  private initLocalStorageFields() {
    this.localStorageFields = new LocalStorageUtils<{ fields: string[], expDate: string }>(DynamicQueryFacetGenerator.ID + "F");
  }
  private saveFields() {
    let date = new Date();
    var pastDate = date.getDate() + 7;
    date.setDate(pastDate);
    this.localStorageFields.save({ fields: this.allFields, expDate: date.toDateString() });
  }

  private getFields() {
    let retrieve = this.localStorageFields.load();
    let curdate = new Date();
    this.allFields = [];
    if (retrieve != null) {
      let expdate = new Date(retrieve.expDate);
      if (curdate <= expdate) {
        this.allFields = retrieve.fields;
      }
    }
  }

  private loadFieldsFromIndex() {
    //When using push do not load anything.
    let _this = this;
    if (this.options.usePush) return;
    this.getFields();
    if (this.allFields.length == 0) {
      this.queryController.getEndpoint().listFields().then((fields: Coveo.IFieldDescription[]) => {
        fields.forEach((field) => {
          if (_this.options.useOnlyUserFields) {
            if ((field.groupByField || field.splitGroupByField) && field.fieldSourceType != "System") {
              this.allFields.push(field.name.replace('@', ''));
            }
          }
          else {
            if ((field.groupByField || field.splitGroupByField)) {
              this.allFields.push(field.name.replace('@', ''));
            }
          }
        });
        this.saveFields();
      });
      
    }
  }


  private get allFacetsInInterface() {
    return ComponentsTypes.getAllFacetInstancesFromElement(this.root) as Component[];
  }

  private getParentFacet() {
    if (this.options.dependsOn == '' || this.options.dependsOn == undefined) return;
    const parent = this.allFacetsInInterface.filter(
      potentialParentFacet => potentialParentFacet.options.id === this.options.dependsOn
    );

    if (!parent.length) {
      this.logger.warn('DependsOn reference does not exist', this.options.dependsOn);
      return null;
    }

    return parent[0];
  }

  public transform(facet) {
    let title = facet;
    //Get Facet from dictionary
    if (this.dictionary[facet] != undefined) {
      title = this.dictionary[facet];
    }
    return title;
  }

  /**
   * Generate the Facets passed as parameters
   *
   * @private
   * @param {IFacetTransformArgs[]} facets to generate
   */
  //private generateFacets(facets: IQueryFacetTransformArgs[]) {
  private generateFacets(facets: string[]) {
    facets.map((facet) => {
      if (facet != '' && facet != undefined) {
        const element = $$('div');
        this.element.appendChild(element.el);
        //const generatedFacet = new DynamicFacet(element.el, { field: facet.field, title: facet.facetTitle });
        let fieldname = '@' + facet;
        let title = this.transform(facet);
        const generatedFacet = new Coveo.DynamicFacet(element.el, { field: fieldname, title: title, id: facet });
        if (this.cacheFacets[fieldname] != undefined && this.cacheFacets[fieldname] != '') {
          generatedFacet.selectMultipleValues(this.cacheFacets[fieldname]);
        }
      }
      //this.ensureFacetState(generatedFacet);
    });
  }

  /**
   * This is required to update the generated facets based on the state. Since they are generated at a later stage, they cannot listen to state change. This method ensures the state of every dynamically generated facet is preserved and correctly handled
   *
   * @private
   * @param {DynamicFacet} facet
   */
  private ensureFacetState(facet: DynamicFacet) {
    // First read the url
    const params = UrlUtils.getUrlParams(location.href);
    const facetId = QueryStateModel.getFacetId(facet.options.id);

    // check if the facet state is consistent between the url and the component
    // This is required because the facets are generated too late
    if (params && params[facetId] && params[facetId] !== JSON.stringify(this.queryStateModel.attributes[facetId])) {
      // if there is a facet value selected in the state but not in the UI.
      // This happens because the facets could be generated dynamically at any moment
      try {
        const values = _.toArray(params[facetId]).slice(1, -1).join('').split(',');
        if (values) {
          // There is a facet value in the url that is not saved into the state
          facet.selectMultipleValues(values);
        }
      } catch (error) {
        this.logger.error('Unable to parse facet state in the url', params[facetId]);
      }
    }
  }

  private updateDynamicFacetAppareance(facets: string[]) {
    // const selectedCategory = this.getCurrentSelectedParentValue();

    //if (selectedCategory !== this.previousSelectedCategory) {
    // Do not clear if same parent selected

    //const facets = this.getFacetsFromQuery(query);

    // Do not regenerate facets if parent facet has not changed
    //const facets = this.getAllowedFacets(selectedCategory);
    if (facets && facets.length > 0) {
      this.clearGeneratedFacet();
      this.generateFacets(facets);
    }

    //this.previousSelectedCategory = selectedCategory;
    //}
  }

  private addCounts(foundFacets: FacetList[], key, value) {
    let found = false;
    foundFacets.forEach((facet) => {
      if (facet.facet == key) {
        facet.occurences = facet.occurences + 1;
        if (Array.isArray(value)) {
          value.forEach((val) => {
            facet.values.push(val);
          });
        } else {
          facet.values.push(value);
        }
        found = true;
      }
    });
    if (!found && !this.blacklisted.includes(key)) {
      let newfacet = new FacetList();
      newfacet.facet = key;
      newfacet.occurences = 1;
      newfacet.values = [];
      if (Array.isArray(value)) {
        value.forEach((val) => {
          newfacet.values.push(val);
        });
      } else newfacet.values.push(value);
      foundFacets.push(newfacet);
    }
  }

  /**
   * Returns the facets based upon the current query
   *
   * @private
   * @param {string} query query to exectue
   * @returns {string[]} Facet names
   */
  private getFacetsFromQuery(query: string) {
    let _this = this;
    var foundFacets = [];
    let queryBuilder = new Coveo.QueryBuilder();

    queryBuilder.pipeline = '';
    queryBuilder.searchHub = 'GettingFacets';
    queryBuilder.enableDidYouMean = false;
    queryBuilder.retrieveFirstSentences = false;
    queryBuilder.enableDebug = false;
    queryBuilder.enableQuerySyntax = true;
    queryBuilder.enableDuplicateFiltering = false;
    queryBuilder.excerptLength = 0;
    queryBuilder.numberOfResults = this.options.noOfResults;
    if (this.options.queryToExecute != '') queryBuilder.advancedExpression.add(this.options.queryToExecute);
    var complete = query;
    if (complete != '') queryBuilder.expression.add(complete);
    var myquery = this.queryController.getEndpoint().search(queryBuilder.build());

    myquery.then(function (data: Coveo.IQueryResults) {
      _this.startQ = new Date();
      data.results.forEach((res: IQueryResult) => {
        let keys = Object.keys(res.raw);
        keys.forEach((key) => {
          if (_this.allFields.includes(key)) {
            _this.addCounts(foundFacets, key, res.raw[key]);
          }
        });
      });
      _this.querytime = data.duration.toString();
      //Sort the list by occurrences
      foundFacets.sort((a, b) => (a.occurences < b.occurences) ? 1 : -1);
      //Only take first xx
      let total = data.totalCountFiltered;
      if (total > _this.options.noOfResults) total = _this.options.noOfResults;
      let percentage = total * (_this.options.tresholdPercentage / 100);
      _this.currentFacets = foundFacets.slice(0, _this.options.noOfFacets).filter((facet) => {
        let allvalues = new Set(facet.values);
        let go = true;
        if (allvalues.size <= 1) go = false;
        //If it has values selected then discard size check
        if (_this.cacheFacets['@' + facet.facet] != '' && _this.cacheFacets['@' + facet.facet] != undefined) go = true;
        return (facet.occurences >= percentage && go);
      }).map(facet => facet.facet);

      console.log('Got Facets, re-execute query');
      _this.gotFacets = true;
      _this.addToCache(query);
      _this.endQ = new Date();
      _this.queryController.executeQuery({
        ignoreWarningSearchEvent: true,
        logInActionsHistory: false,
      });

    });


  }


  /**
   * Returns the facets based upon the current query
   *
   * @private
   * @param {string} query query to exectue
   * @returns {string[]} Facet names
   */
  private getFacetsFromPushQueryResults(query: string) {
    let _this = this;
    var foundFacets = [];
    let queryBuilder = new Coveo.QueryBuilder();

    queryBuilder.pipeline = '';
    queryBuilder.searchHub = 'GettingFacets';
    queryBuilder.enableDebug = false;
    queryBuilder.enableQuerySyntax = true;
    queryBuilder.enableDuplicateFiltering = false;
    queryBuilder.sortCriteria = "datedescending";
    queryBuilder.excerptLength = 0;
    queryBuilder.numberOfResults = this.options.noOfResults;
    queryBuilder.fieldsToInclude = ['@' + this.options.pushGroupField];
    if (this.options.queryToExecute != '') queryBuilder.advancedExpression.add(this.options.queryToExecute);
    var complete = query;
    if (complete != '') queryBuilder.expression.add(complete);
    var myquery = this.queryController.getEndpoint().search(queryBuilder.build());

    myquery.then(function (data: Coveo.IQueryResults) {
      data.results.forEach((res: IQueryResult) => {
        let facets = res.raw[_this.options.pushGroupField];
        facets.forEach((key) => {
          //if (_this.allFields.includes(key)){
          _this.addCounts(foundFacets, key, facets);
          //}
        });
      });
      _this.querytime = data.duration.toString();
      //Sort the list by occurrences
      foundFacets.sort((a, b) => (a.occurences < b.occurences) ? 1 : -1);
      //Only take first xx
      //console.log('Found Facets: '+foundFacets);
      _this.currentFacets = foundFacets.slice(0, _this.options.noOfFacets).map((facet) => { return facet.facet });
      console.log('Got Facets, re-execute query');
      _this.gotFacets = true;
      _this.addToCache(query);
      _this.queryController.executeQuery({
        ignoreWarningSearchEvent: true,
        logInActionsHistory: false,
      });
      return

    });


  }

  /**
   * Returns the facets based upon the current query
   *
   * @private
   * @param {string} query query to exectue
   * @returns {string[]} Facet names
   */
  private getFacetsFromPushQuery(query: string) {
    let _this = this;
    var foundFacets = [];


    var myRequest = {
      field: '@' + this.options.pushGroupField,
      sortCriteria: "occurrences",
      maximumNumberOfValues: this.options.noOfFacets,
      queryOverride: query + ' ' + this.options.queryToExecute//args.queryBuilder.computeCompleteExpression()
    };

    Coveo.SearchEndpoint.endpoints.default
      .listFieldValues(myRequest)
      .then(function (response) {
        var values = response;
        var singles = [];
        for (var i = 0; i < values.length; i++) {
          singles.push(values[i].value);
        }
        _this.querytime = "N/A";
        _this.currentFacets = singles;
        console.log('Got Facets, re-execute query');
        _this.gotFacets = true;
        _this.addToCache(query);
        _this.queryController.executeQuery({
          ignoreWarningSearchEvent: true,
          logInActionsHistory: false,
        });

      });


  }



  private createAdvancedQuery() {
    let adv = "";
    let allFacets = document.querySelectorAll(".CoveoDynamicFacet,.CoveoDynamicHierarchicalFacet");
    allFacets.forEach((facet) => {
      let field = '';
      let values = [];
      //@ts-ignore
      if (facet.CoveoDynamicFacet != undefined) {
        //@ts-ignore
        field = facet.CoveoDynamicFacet.options.field;
        this.cacheFacets[field] = '';
        //@ts-ignore
        values = facet.CoveoDynamicFacet.values.selectedValues;
      } else {
        //@ts-ignore
        field = facet.CoveoDynamicHierarchicalFacet.options.field;
        this.cacheFacets[field] = '';
        //@ts-ignore
        values = facet.CoveoDynamicHierarchicalFacet.values.selectedPath;
      }
      if (values != null && values.length > 0) {
        this.cacheFacets[field] = values;
        const expressionFromFacet = new ExpressionBuilder();
        expressionFromFacet.addFieldExpression(field, "==", values);
        adv = adv + ' ' + expressionFromFacet.build();
      }
    });
    return adv;
  }

  private getFromCache(query): string {
    let facets = "";
    this.myCache.forEach((item) => {
      if (item.query == query) {
        facets = item.facets;
      }
    });
    return facets;
  }

  private addToCache(query) {
    if (this.getFromCache(query) == '') {
      let newitem = new CacheList();
      newitem.query = query;
      newitem.facets = this.currentFacets.join(';');
      this.myCache.push(newitem);
    }
  }

  private handleBuildingQuery(args: IBuildingQueryEventArgs) {
    //Check if depends on is set
    let go = false;
    //Check if dependend facet is selected
    let parent = this.getParentFacet();
    if (parent == null) { go = true; }
    //@ts-ignore
    if (parent != null && parent.values.selectedValues.length != 0) {
      go = true;
    }
    if (go == false) {
      //Clear the added facets
      this.clearGeneratedFacet();
    }
    if (go) {
      let currentQuery = Coveo.state(this.root, 'q');
      let currentState = JSON.stringify(this.queryStateModel.attributes);

      let facets = [];
      this.comment = "";
      this.record = false;
      if (currentQuery != undefined) {
        console.log("Handle Building Query, currentQuery is NOT empty");
        if (this.previousQuery != currentQuery || (currentState != this.previousState && this.options.useAdvancedQuery)) {
          //Cancel query if we do not have the facets yet
          console.log("Query is different we need to do more");

          if (!this.gotFacets) {
            console.log("Facets are NOT retrieved, do it now");
            this.start = new Date();
            if (this.options.useAdvancedQuery) {
              let advanced = this.createAdvancedQuery();
              currentQuery = currentQuery + ' ' + advanced;
            }
            let fromCache = this.getFromCache(currentQuery);
            if (fromCache != '') {
              this.currentFacets = fromCache.split(';');
              console.log('From FACET cache');
              this.querytime = '0';
              this.comment = "FROM FACET CACHE<BR>";
            }
            else {
              args.cancel = true;
              console.log('Cancel current query, because we need to fetch the needed facets first');
              if (this.options.usePush) {
                if (this.options.usePushAsQuery) {
                  this.getFacetsFromPushQueryResults(currentQuery);
                } else this.getFacetsFromPushQuery(currentQuery);
              } else this.getFacetsFromQuery(currentQuery);
              return;
            }

          }
          this.record = true;
          console.log("Facets are retrieved, update the UI");
          this.previousQuery = currentQuery;
          this.previousState = currentState;
          this.gotFacets = false;
          this.updateDynamicFacetAppareance(this.currentFacets);

        }

      }
    }
  }
}
