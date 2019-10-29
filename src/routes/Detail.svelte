<script>
	console.log("detail");
	let modelCho = window.location.pathname.slice(-6);
	console.log(modelCho);
	export let queryUrl;
	let queryModel = ``;
	function getData(modelCho) {
		queryModel = `
		PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
		PREFIX dc: <http://purl.org/dc/elements/1.1/>
		PREFIX dct: <http://purl.org/dc/terms/>
		PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
		PREFIX edm: <http://www.europeana.eu/schemas/edm/>
		PREFIX foaf: <http://xmlns.com/foaf/0.1/>
		SELECT DISTINCT ?modelNaam ?placeName ?imageModel WHERE {
		   https://hdl.handle.net/20.500.11840/` + modelCho + ` ?b ?c .
		   ?place skos:prefLabel ?placeName .
		   https://hdl.handle.net/20.500.11840/` + modelCho + ` dc:title ?modelNaam ;
		        dc:type ?type ;
		        dct:spatial ?place ;
		        edm:isShownBy ?imageModel .
		}
		`
		console.log(queryModel);
	}
	getData(modelCho);
	function runQueryModel(queryUrl, queryModel){
	  //Test if the endpoint is up and print result to page
	  // (you can improve this script by making the next part of this function wait for a succesful result)
	  fetch(queryUrl+"?query="+ encodeURIComponent(queryModel) +"&format=json")
	  .then(res => res.json())
	  .then(json => {
		  dataModel = json.results.bindings
		  console.log(dataModel);
	  })
	}
	runQueryModel(queryUrl, queryModel);
</script>
<h1>tijdelijk</h1>
