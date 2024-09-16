document.addEventListener("DOMContentLoaded", function (event) {
  var getAddCode = function (name) {
    var data = "<!-- add -->";
    switch (name) {
      case "article":
        data =
          '<ins class="adsbygoogle" style="display:block; text-align:center;" data-ad-layout="in-article" data-ad-format="fluid" data-ad-client="ca-pub-8955684300110547" data-ad-slot="3366278060"></ins>';
        break;
      case "link":
        data =
          '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-8955684300110547" data-ad-slot="5817528115" data-ad-format="link" data-full-width-responsive="true"></ins>';
        break;
      case "auto":
        data =
          '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-8955684300110547" data-ad-slot="7228096482" data-ad-format="auto" data-full-width-responsive="true"></ins>';
        break;
    }
    return data;
  };
  var insertAddUnit = function (name) {
    return getAddCode(name);
  };
  const addTypes = ["article", "link", "auto"];
  addTypes.map((name) => {
    var adds = document.querySelectorAll(`.add-in-${name}`);
    adds.forEach(function (item, index) {
      console.log(">>>loaded add", item, name);
      item.innerHTML = insertAddUnit(name);
      (adsbygoogle = window.adsbygoogle || []).push({});
    });
  });
  console.log("Google Adsense Checking...");
});
