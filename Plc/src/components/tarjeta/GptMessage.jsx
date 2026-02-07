import React from "react";
import Markdown from "react-markdown";

import VegaChart from "../graficos/VegaChart";

function GptMessage({ text }) {
  return (
    <div className="col-start-1 col-end-9 p-3 rounded-lg">
      <div className="flex flex-row items-start">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-600 flex-shrink-0">
          D
        </div>
        <div className="relative ml-3 text-sm bg-black bg-opacity-25 pt-3 pb-2 px-4 shadow rounded-xl w-100">
          <Markdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const isJson = match && (match[1] === "json" || match[1] === "vega");

                if (!inline && isJson) {
                  try {
                    const content = String(children).replace(/\n$/, "");
                    const json = JSON.parse(content);
                    // Detectar si es un esquema Vega-Lite
                    if (json.$schema && json.$schema.includes("vega-lite")) {
                      return <VegaChart spec={json} />;
                    }
                  } catch (e) {
                    // Si falla el parseo, pintar código normal
                  }
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {text}
          </Markdown>
        </div>
      </div>
    </div>
  );
}

export default React.memo(GptMessage);
