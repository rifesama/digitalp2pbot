import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path from "path";

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Determine the correct path based on the environment
const basePath = process.env.NODE_ENV === 'test'
    ? path.join(__dirname, "../locales")  // Adjust this path as needed for your local setup
    : '/opt/nodejs/node_modules/digitalp2pbot-commons/locales';  // Path in AWS Lambda

const localesPath = `${basePath}/{{lng}}.yaml`;

i18next.use(Backend)
    .init({
        debug: true,
        backend: {
            loadPath: localesPath,
        },
        fallbackLng: "en",
        preload: ["es", "en"], // Preload all languages you want to use
        missingKeyHandler: (
            lng,
            ns,
            key,
            fallbackValue,
            updateMissing,
            options
        ) => {
            console.error(
                `Missing translation - Language: ${lng.join(
                    ", "
                )}, Namespace: ${ns}, Key: ${key}, Fallback Value: ${fallbackValue}`
            );
        },
    })
    .then(() => {
        console.log("i18next is ready...");
        console.log(i18next.t("start")); // Example translation use
    })
    .catch((err) => console.error("Error initializing i18next:", err));

export default i18next;
