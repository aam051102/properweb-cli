document.body.querySelector("button").addEventListener("click", e => {
	e.preventDefault();

	const component = (
		<>
			<li className="test-li">
				<p>A new component.</p>
			</li>
			<li className="test-li-2">
				<p>A new component 2.</p>
			</li>
		</>
	);

	render(component, document.body.querySelector("ul"));
});