if (!document.querySelector("head > link[rel=stylesheet]#aw-theme-1")) {
  const roundedTheme = document.createElement("link");
  roundedTheme.setAttribute("rel", "stylesheet");
  roundedTheme.setAttribute(
    "href",
    "https://static.animeworld.ac/dist/frontend/themes/theme-1.css",
  );
  roundedTheme.setAttribute("id", "aw-theme-1");
  document.querySelector("head").append(roundedTheme);
}
