import "../partials/sub";

const handleClick = e => {
	render(<p>Cool, new, component.</p>, e.target);
};

document.body.querySelector("button").addEventListener("click", e => {
	e.preventDefault();

	const component = (
		<>
			<li className="test-li">
				<p>A new component.</p>
			</li>
			<li className="test-li-2">
				<p onClick={handleClick}>A new component 2.</p>
			</li>
		</>
	);

	render(component, document.body.querySelector("ul"));
});