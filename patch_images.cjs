const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `            const imgResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: [{ text: \`\${slide.imagePrompt}. Veterinary medicine high-resolution clinical photograph.\` }],
              config: {
                imageConfig: {
                  aspectRatio: "1:1"
                }
              }
            });

            let base64Image = "";
            if (imgResponse?.candidates?.[0]?.content?.parts) {
              for (const part of imgResponse.candidates[0].content.parts) {
                if (part.inlineData) {
                  base64Image = part.inlineData.data;
                  break;
                }
              }
            }`;

const replacementStr = `            const imgResponse = await ai.models.generateImages({
              model: 'imagen-3.0-generate-002',
              prompt: \`\${slide.imagePrompt}. Veterinary medicine high-resolution clinical photograph.\`,
              config: {
                numberOfImages: 1,
                aspectRatio: "1:1",
                outputMimeType: "image/jpeg"
              }
            });

            let base64Image = imgResponse?.generatedImages?.[0]?.image?.imageBytes || "";`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('server.ts', code);
