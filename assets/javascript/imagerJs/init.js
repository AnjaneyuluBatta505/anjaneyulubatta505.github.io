var pluginsConfig = {
  Rotate: {
    controlsCss: {
      width: "15px",
      height: "15px",
      background: "white",
      border: "1px solid black",
    },
    controlsTouchCss: {
      width: "25px",
      height: "25px",
      background: "white",
      border: "2px solid black",
    },
  },
  Resize: {
    controlsCss: {
      width: "15px",
      height: "15px",
      background: "white",
      border: "1px solid black",
    },
    controlsTouchCss: {
      width: "25px",
      height: "25px",
      background: "white",
      border: "2px solid black",
    },
  },
  Crop: {
    controlsCss: {
      width: "15px",
      height: "15px",
      background: "white",
      border: "1px solid black",
    },
    controlsTouchCss: {
      width: "25px",
      height: "25px",
      background: "white",
      border: "2px solid black",
    },
  },
  Toolbar: {
    toolbarSize: 85,
    toolbarSizeTouch: 43,
    tooltipEnabled: true,
    tooltipCss: {
      color: "white",
      background: "black",
    },
  },
  Delete: {
    fullRemove: false,
  },
};

var options = {
  plugins: ["Rotate", "Crop", "Resize", "Save", "Toolbar", "Delete", "Undo"],
  editModeCss: {},
  pluginsConfig: pluginsConfig,
  quality: {
    sizes: [
      { label: "Original", scale: 1, quality: 1, percentage: 100 },
      { label: "Large", scale: 0.5, quality: 0.5, percentage: 50 },
      { label: "Medium", scale: 0.2, quality: 0.2, percentage: 20 },
      { label: "Small", scale: 0.05, quality: 0.05, percentage: 5 },
    ],
    allowCustomSetting: true,
  },
  contentConfig: {
    saveImageData: function (imageId, imageData) {
      console.log("imageData", imageId, imageData);
      try {
        console.log("Save button clicked! ImageId:", imageId);
        console.log(
          "ImageData argument here is the image encoded in base64 string. " +
            "This function gets called anytime user clicks on `save` button. " +
            "If one wants to disable edit after saving, check the `standalone-remote-upload.html` " +
            "example file which shows how to upload image on the server " +
            "and display it in place of ImagerJs after that."
        );
        localStorage.setItem("image_" + imageId, imageData);
      } catch (err) {
        console.error(err);
      }
    },
  },
};

// init plugin
(function () {
  var $imageContainer = $(
    `<div class="image-container">
      <img
        class="imager-test" 
        src=""
        style="min-width: 100%; min-height: auto; width: 500px;"
      >
    </div>`
  );

  $("#imagers").append($imageContainer);
  var imager = new ImagerJs.Imager($imageContainer.find("img"), options);
  imager.startSelector();

  imager.on("editStart", function () {
    // fix image dimensions so that it could be properly placed on the grid
    imager.$imageElement.css({
      minWidth: "auto",
      minHeight: "auto",
    });
    var qualitySelector = new window.ImagerQualitySelector(
      imager,
      options.quality
    );

    var qualityContainer = $('<div class="imager-quality-standalone"></div>');
    qualityContainer.append(qualitySelector.getElement());

    imager.$editContainer.append(qualityContainer);

    qualitySelector.show();
    qualitySelector.update();
  });
})();
