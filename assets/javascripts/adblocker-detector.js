async function detectAdBlock() {
  let adBlockEnabled = false;
  const googleAdUrl =
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
  try {
    await fetch(new Request(googleAdUrl)).catch((_) => (adBlockEnabled = true));
  } catch (e) {
    adBlockEnabled = true;
  } finally {
    console.log(`AdBlock Enabled: ${adBlockEnabled}`);
    return adBlockEnabled;
  }
}

setTimeout(async function () {
  const isBlocked = await detectAdBlock();
  const adBlockDiv = document.getElementById("ad-block-message");
  const closeBtn = document.getElementById("close-message");
  if (isBlocked && !window.location.host.startsWith("localhost")) {
    adBlockDiv.style.display = "block";
    closeBtn.addEventListener("click", () => {
      adBlockDiv.remove();
    });
  } else {
    adBlockDiv.style.display = "none";
  }
}, 1000);
