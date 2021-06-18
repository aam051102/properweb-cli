import JSX from "jsx";
import "src/js/partials/sub2";

document.body.querySelector("ul").addEventListener("click", e => {
    e.preventDefault();

    const component = (
        <p>A new component.</p>
    );

    JSX.render(component, document.body);
});

console.log("Sub loaded");