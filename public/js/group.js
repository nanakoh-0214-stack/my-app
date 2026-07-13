function toggleWeight() {
	const enabled =
		document.querySelector('input[name="useWeight"]:checked').value === "true";

	document.querySelectorAll(".weight-input").forEach(input => {
		input.disabled = !enabled;
	});
}

toggleWeight();