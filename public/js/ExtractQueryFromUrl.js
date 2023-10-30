function extractQueryParameterFromURL(paramName) {
    const url = new URL(window.location.href);
    const queryParam = url.searchParams.get(paramName);
    const decodedQueryString = decodeURIComponent(queryParam);
    return decodedQueryString;
 }