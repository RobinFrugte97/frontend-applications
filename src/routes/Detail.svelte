<script>
  	import { onMount } from "svelte";
	const queryUrl2 ="https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-08/sparql"
	let modelCho = window.location.pathname.slice(-6);
	let queryModel = ``;
	let dataModel = [];
	console.log(dataModel);
	
	function getData(modelCho) {
		queryModel = `
		PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
		PREFIX dc: <http://purl.org/dc/elements/1.1/>
		PREFIX dct: <http://purl.org/dc/terms/>
		PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
		PREFIX edm: <http://www.europeana.eu/schemas/edm/>
		PREFIX foaf: <http://xmlns.com/foaf/0.1/>
		SELECT ?cho ?modelNaam ?placeName ?imageModel WHERE {

		   <https://hdl.handle.net/20.500.11840/` + modelCho + `> dc:title ?modelNaam ;
		        dc:type ?type ;
		        dct:spatial ?place ;
		        edm:isShownBy ?imageModel .
		} LIMIT 1
		`
		console.log(queryModel);
	}
	async function runQueryModel(queryUrl2, queryModel){
		console.log(queryUrl2);
		console.log(queryModel);
		
		
	  //Test if the endpoint is up and print result to page
	  // (you can improve this script by making the next part of this function wait for a succesful result)
	  await fetch(queryUrl2+"?query="+ encodeURIComponent(queryModel) +"&format=json")
	  .then(res => res.json())
	  .then(json => {
		  dataModel = json.results.bindings
		  console.log(dataModel[0]);
	  })
	}
	getData(modelCho);
	runQueryModel(queryUrl2, queryModel)
			
</script>
{#if dataModel.length == 1}
<h1>{dataModel[0].modelNaam.value}</h1>
<img src={dataModel[0].imageModel.value} alt="">
{/if}