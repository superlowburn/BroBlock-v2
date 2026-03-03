/**
 * BroBlock V2 — Twitter API Interceptor
 * Runs in MAIN world (same JS context as Twitter).
 * Patches fetch() to extract user metadata (follower/following counts)
 * from Twitter GraphQL responses. Communicates via postMessage.
 *
 * CRITICAL: This script must NEVER throw or break Twitter's fetch.
 */
(() => {
  var MSG_TYPE = "bb-user-data";
  var originalFetch = window.fetch;

  window.fetch = function () {
    var args = arguments;
    var p = originalFetch.apply(this, args);

    p.then(function (response) {
      try {
        var url = "";
        if (typeof args[0] === "string") {
          url = args[0];
        } else if (args[0] && typeof args[0].url === "string") {
          url = args[0].url;
        }

        if (url.indexOf("/i/api/graphql/") !== -1 || url.indexOf("/i/api/2/") !== -1) {
          response.clone().json().then(function (json) {
            var users = extractUsers(json);
            if (users.length > 0) {
              var map = {};
              for (var i = 0; i < users.length; i++) {
                map[users[i][0]] = users[i][1];
              }
              window.postMessage({ type: MSG_TYPE, users: map }, "*");
            }
          }).catch(function () {});
        }
      } catch (e) {
        // Never break Twitter's fetch
      }
    }).catch(function () {});

    return p;
  };

  /**
   * Recursively walk a parsed GraphQL response and extract user objects.
   * Twitter user objects have legacy.screen_name + legacy.followers_count.
   * Returns array of [handle, { followers, following }] pairs.
   */
  function extractUsers(obj) {
    var result = [];
    walk(obj, 0, result);
    return result;
  }

  function walk(obj, depth, result) {
    if (!obj || typeof obj !== "object" || depth > 20) return;

    // Check if this node is a Twitter user result
    var leg = obj.legacy;
    if (
      leg &&
      typeof leg === "object" &&
      typeof leg.screen_name === "string" &&
      typeof leg.followers_count === "number"
    ) {
      result.push([
        leg.screen_name.toLowerCase(),
        {
          followers: leg.followers_count,
          following: leg.friends_count || 0,
          bio: typeof leg.description === "string" ? leg.description : "",
          viewerFollows: leg.following === true,
        },
      ]);
    }

    // Recurse into arrays and objects
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        walk(obj[i], depth + 1, result);
      }
    } else {
      var keys = Object.keys(obj);
      for (var k = 0; k < keys.length; k++) {
        walk(obj[keys[k]], depth + 1, result);
      }
    }
  }
})();
