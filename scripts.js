document.getElementById("sendData").addEventListener("click", function() {
    fetch("/api/data", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: "John Doe", age: 25 })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById("response").textContent = data.message;
    })
    .catch(error => console.error("Error:", error));
});
