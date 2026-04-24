import { fal } from "@fal-ai/client";

async function run() {
  try {
    const result = await fal.subscribe("fal-ai/bria/background/remove", {
      input: {
        image_url: "https://fal.media/files/monkey.jpg",
        return_mask: true
      }
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
  }
}

run();
