function jsonInputChanged(e) {
  const $input = e.target;
  const $error = document.getElementById("id_input_error");
  const $output = document.getElementById("id_json_formatter_output");

  // RESET DATA
  $error.innerHTML = "";
  $output.innerHTML = "";

  const dataStr = $input.value;
  $input.classList.remove("error");
  let data;
  try {
    data = JSON.parse(dataStr);
  } catch (e) {
    console.error(e);
    // SHOW ERROR
    $input.classList.add("error");
    $error.innerHTML = "Invalid JSON input. Failed to format the JSON";
    return false;
  }
  // SHOW JSON TREE
  var tree = jsonTree.create(data, $output);
}

function initJSONFormatter() {
  const input = document.querySelector("#id_json_formatter_input textarea");
  input.addEventListener("keyup", jsonInputChanged);
  input.dispatchEvent(new Event("keyup"));
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("document loaded");
  initJSONFormatter();
});
