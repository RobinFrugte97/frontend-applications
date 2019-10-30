# Indonesian architecture throughout the years

This app is a visualization of Indonesia on which every prominent location is indicated with a certain architecture of that location. You can navigate through the years and watch the architecture of every location change. You can get more information about a certain architecture by clicking on it.

![Concept visualization](https://github.com/RobinFrugte97/frontend-applications/blob/master/src/Screenshot_13.png)

---

# svelte app

This uses the framework [Svelte](https://svelte.dev).

*Note that you will need to have [Node.js](https://nodejs.org) installed.*

---

## Get started

Install the dependencies...

```bash
cd svelte-app
npm install
```

...then start the app:

```bash
npm run dev
```

Navigate to [localhost:5000](http://localhost:5000). You should see your app running. Edit a component file in `src`, save it, and reload the page to see your changes.

By default, the server will only respond to requests from localhost.

---

## Tech

[Svelte](https://svelte.dev/)
[Svelte-routing](https://github.com/EmilTholin/svelte-routing)

---

## Data

The data I'm using comes from the API of [Netwerk digitaal erfgoed](https://www.netwerkdigitaalerfgoed.nl/), with my unique URL:
`https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-08/sparql`
I'm gathering data about all the housemodels in Indonesia to get an idea about the architecture.

The SPARQL query I use the retrieve all the data I need in the application:

```
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX edm: <http://www.europeana.eu/schemas/edm/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT DISTINCT ?cho ?modelNaam ?placeName ?imageModel WHERE {
   <https://hdl.handle.net/20.500.11840/termmaster7745> skos:narrower* ?place .
   ?place skos:prefLabel ?placeName .
   VALUES ?type {"huismodel" "Huismodel"} .
   ?cho dc:title ?modelNaam ;
		dc:type ?type ;
		dct:spatial ?place ;
		edm:isShownBy ?imageModel .
} ORDER BY ?cho LIMIT 25
```
