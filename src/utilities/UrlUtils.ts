export class UrlUtils {
  // Utility class taken from Jean-Francois Allaires's Generator to save some time
  static getUrlParams = (query) => {
    if (!query) {
      return {};
    }

    const parser = document.createElement('a');
    let search = '';
    parser.href = query;
    const hash = parser.hash.substring(1);
    if (hash) {
      const hashParser = document.createElement('a');
      hashParser.href = hash;
      search = hashParser.search.substring(1);
    } else {
      search = parser.search.substring(1);
    }

    search = search || query;

    return (/^[?#]/.test(search) ? search.slice(1) : search).split('&').reduce((params, param) => {
      const [key, value] = param.split('=');
      params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
      return params;
    }, {});
  };
}
