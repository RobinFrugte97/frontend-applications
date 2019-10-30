<script>
	export let url = "";
	import { Router, Route } from "svelte-routing";
  	import { onMount } from "svelte";
	import NavLink from "./components/NavLink.svelte";
	import Home from "./routes/Home.svelte";
	import Detail from "./routes/Detail.svelte";

	const queryUrl ="https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-08/sparql"
	const query = `
	PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
	PREFIX dc: <http://purl.org/dc/elements/1.1/>
	PREFIX dct: <http://purl.org/dc/terms/>
	PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
	PREFIX edm: <http://www.europeana.eu/schemas/edm/>
	PREFIX foaf: <http://xmlns.com/foaf/0.1/>
	SELECT DISTINCT ?cho ?modelName ?placeName ?imageModel WHERE {
	   <https://hdl.handle.net/20.500.11840/termmaster7745> skos:narrower* ?place .
	   ?place skos:prefLabel ?placeName .
	   VALUES ?type {"huismodel" "Huismodel"} .
	   ?cho dc:title ?modelName ;
	        dc:type ?type ;
	        dct:spatial ?place ;
	        edm:isShownBy ?imageModel .
	} ORDER BY ?cho LIMIT 5
	`

	let data = [];
	function runQuery(queryUrl, query){
	  fetch(queryUrl+"?query="+ encodeURIComponent(query) +"&format=json")
	  .then(res => res.json())
	  .then(json => {
		  data = json.results.bindings

	  })
	}
	onMount(() => {
		runQuery(queryUrl, query);
	});
	
	
</script>

<Router url="{url}">
  <nav>
    <NavLink to="/">Home</NavLink>
  </nav>
  <div>
    <Route path="/" component="{Home}" data={data} />
	<Route path="/details/*" component="{Detail}" />
  </div>
</Router>
