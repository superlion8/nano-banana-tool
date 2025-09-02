import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 检查环境变量
    if (!process.env.GOOGLE_API_KEY) {
        return res.status(500).json({
            error: 'Server configuration error',
            message: 'Google API key not configured'
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            message: 'Only POST requests are supported'
        });
    }

    try {
        const { prompt, imageData } = req.body;

        if (!prompt || !imageData) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'prompt and imageData are required'
            });
        }

        // 初始化Google AI客户端
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        });

        console.log('Single image edit request:', { prompt, imageDataLength: imageData.length });

        // 准备请求内容
        const contents = [
            {
                parts: [
                    {
                        text: prompt
                    },
                    {
                        inline_data: {
                            mime_type: "image/png",
                            data: imageData
                        }
                    }
                ]
            }
        ];

        // 生成内容
        const result = await model.generateContent(contents);
        const response = await result.response;

        console.log('Single image edit response received');

        // 处理响应
        const parts = response.candidates[0].content.parts;
        let generatedImage = null;
        let generatedText = null;

        for (const part of parts) {
            if (part.text) {
                generatedText = part.text;
                console.log('Generated text:', generatedText);
            } else if (part.inlineData) {
                generatedImage = part.inlineData.data;
                console.log('Generated image data length:', generatedImage.length);
            }
        }

        if (!generatedImage) {
            return res.status(500).json({
                error: 'Generation failed',
                message: 'No image was generated'
            });
        }

        // 返回结果
        return res.status(200).json({
            success: true,
            data: {
                image: `data:image/png;base64,${generatedImage}`,
                text: generatedText || '',
                prompt: prompt
            }
        });

    } catch (error) {
        console.error('Single image edit error:', error);
        
        let errorMessage = 'An unexpected error occurred';
        if (error.message) {
            errorMessage = error.message;
        }

        return res.status(500).json({
            error: 'Generation failed',
            message: errorMessage,
            details: error.toString()
        });
    }
}
