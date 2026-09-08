export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.endsWith(".workers.dev")) {
      url.hostname = "wwwdigisol.com";
      url.protocol = "https:";
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
