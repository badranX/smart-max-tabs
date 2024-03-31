document.addEventListener("DOMContentLoaded", function () {

    const urlList = document.getElementById("urlList");
    const urlFilter = document.getElementById("urlFilter");

    // Function to send a message to the background script
    function sendMessageToBackground(message, callback) {
        // Firefox - using Promise
        browser.runtime.sendMessage(message).then(callback).catch((error) => {
            console.error("Error communicating with background script:", error);
        });
        //TODO handle chrome
        //browser.runtime.sendMessage(message, callback);
    }

    // Populate the sidebar with URLs
    function populateURLs() {
        // Ask the background script for closed tabs
        sendMessageToBackground({
            action: "getClosedTabs"
        }, (closedTabs) => {
            urlList.innerHTML = ""; // Clear the list
            // Filter the closed tabs based on the search query
            const filteredUrls = closedTabs.filter((tab) =>
                //TODO title undefined check
                tab.title.toLowerCase().includes(urlFilter.value.toLowerCase())
            );

            filteredUrls.forEach((tab) => {
                const li = document.createElement("li");
                const a = document.createElement("a");
                a.textContent = tab.title;
                a.href = "#";
                a.addEventListener("click", function () {
                    // Open the closed tab URL in a new tab
                    browser.tabs.create({
                        url: tab.url
                    });
                });
                li.appendChild(a);
                urlList.appendChild(li);
            });
        })
    }

    // Initial population
    populateURLs();

    // Handle search input
    urlFilter.addEventListener("input", populateURLs);
});