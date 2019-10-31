<script>
    export let title;
    export let image;
    export let placeName;
    export let date;
    export let description;
</script>
<style>
    img {
		width: 40rem;
	}
	section {
		display: flex;
    }
    div {
		padding: 2rem;
	}
</style>
<h1>{title}</h1>
<section>
    <img src={image} alt="{title}">
    <div>
        <h2>Herkomst:</h2>
        <p>{placeName}</p>
        <h2>Datum:</h2>
        <p>{description}</p>
        <p>Model van een Minangkabau woning met uitbreiding. In een Minangkabau familiewoning wonen meerdere gezinnen, alle afstammelingen van dezelfde grootmoeder. Het huis is verdeeld in evenveel afdelingen (ruangs) als er gezinnen wonen. Wordt een Minangkabau huis te klein dan kunnen aan weerszijden stukken worden bijgebouwd, waarvan het dak evenals dat van het oorspronkelijke gedeelte in spits toelopende punten (tanduk) eindigt. Het onderhavige model heeft vier punten. Er bestaan woningen van twee, vier, zes of acht punten.</p>
    </div>
</section>