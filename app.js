// 获取DOM元素
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const targetTextEl = document.getElementById('targetText');
const feedbackEl = document.getElementById('feedback');
const waveCanvas = document.getElementById('waveCanvas');
const analysisCanvas = document.getElementById('analysisCanvas');

// 获取Canvas上下文
const waveCtx = waveCanvas.getContext('2d');
const analysisCtx = analysisCanvas.getContext('2d');

// 目标文本
const targetText = targetTextEl.textContent.match(/"([^"]+)"/)[1];
const targetPhonemes = ["ʃiː", "sɛlz", "ˈsiːʃɛlz", "baɪ", "ðə", "ˈsiːʃɔːr"];

// 音频相关变量
let audioContext;
let analyser;
let microphone;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let animationId;
let recordingStartTime;

// 初始化Canvas
function initCanvas() {
    waveCtx.fillStyle = '#ffffff';
    waveCtx.fillRect(0, 0, waveCanvas.width, waveCanvas.height);
    
    analysisCtx.clearRect(0, 0, analysisCanvas.width, analysisCanvas.height);
    
    // 绘制标题和基线
    waveCtx.fillStyle = '#2c3e50';
    waveCtx.font = '16px Arial';
    waveCtx.fillText('实时音频波形', 20, 30);
    
    waveCtx.strokeStyle = '#ecf0f1';
    waveCtx.beginPath();
    waveCtx.moveTo(0, waveCanvas.height/2);
    waveCtx.lineTo(waveCanvas.width, waveCanvas.height/2);
    waveCtx.stroke();
}

// 开始录音
recordBtn.addEventListener('click', async () => {
    try {
        feedbackEl.innerHTML = '<p>准备录音中...</p>';
        
        // 初始化音频上下文
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        await audioContext.resume();
        
        // 创建分析节点
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        
        // 获取麦克风访问权限
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        // 设置MediaRecorder
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = handleDataAvailable;
        mediaRecorder.onstop = handleStop;
        
        // 开始录音
        mediaRecorder.start(100); // 每100ms收集一次数据
        isRecording = true;
        recordingStartTime = Date.now();
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        analyzeBtn.disabled = true;
        
        // 开始波形可视化
        visualizeWaveform();
        
        feedbackEl.innerHTML = '<p>录音进行中...请朗读上方句子</p>';
        
    } catch (error) {
        console.error('录音错误:', error);
        feedbackEl.innerHTML = `<p class="error">错误: ${error.message}</p>`;
    }
});

// 停止录音
stopBtn.addEventListener('click', () => {
    if (isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        analyzeBtn.disabled = false;
        
        // 停止动画
        cancelAnimationFrame(animationId);
        
        // 断开麦克风连接
        microphone.disconnect();
        
        const recordingDuration = ((Date.now() - recordingStartTime) / 1000).toFixed(2);
        feedbackEl.innerHTML = `<p>录音完成，时长 ${recordingDuration} 秒。点击"分析发音"获取反馈</p>`;
    }
});

// 分析发音
analyzeBtn.addEventListener('click', async () => {
    feedbackEl.innerHTML = '<div class="loading">分析中...<div class="spinner"></div></div>';
    
    try {
        // 创建音频Blob
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        
        // 这里应该是调用专业API的部分
        // 为了演示，我们使用模拟数据
        const analysisResult = await simulatePronunciationAnalysis(audioBlob, targetText);
        
        // 显示分析结果
        displayAnalysisResults(analysisResult);
        
        // 绘制分析结果
        drawAnalysisResults(analysisResult);
        
    } catch (error) {
        console.error('分析错误:', error);
        feedbackEl.innerHTML = `<p class="error">分析失败: ${error.message}</p>`;
    }
});

// 处理录音数据
function handleDataAvailable(event) {
    audioChunks.push(event.data);
}

// 录音停止处理
function handleStop() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    console.log('录音Blob创建完成', audioBlob);
    // 实际应用中，这里可以上传到服务器或保存
}

// 可视化波形
function visualizeWaveform() {
    if (!isRecording) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);
    
    // 清除Canvas
    waveCtx.fillStyle = '#ffffff';
    waveCtx.fillRect(0, 0, waveCanvas.width, waveCanvas.height);
    
    // 绘制基线
    waveCtx.strokeStyle = '#ecf0f1';
    waveCtx.beginPath();
    waveCtx.moveTo(0, waveCanvas.height/2);
    waveCtx.lineTo(waveCanvas.width, waveCanvas.height/2);
    waveCtx.stroke();
    
    // 绘制波形
    waveCtx.lineWidth = 2;
    waveCtx.strokeStyle = '#3498db';
    waveCtx.beginPath();
    
    const sliceWidth = waveCanvas.width * 1.0 / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * waveCanvas.height / 2;
        
        if (i === 0) {
            waveCtx.moveTo(x, y);
        } else {
            waveCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    waveCtx.lineTo(waveCanvas.width, waveCanvas.height/2);
    waveCtx.stroke();
    
    // 添加标签
    waveCtx.fillStyle = '#2c3e50';
    waveCtx.font = '16px Arial';
    waveCtx.fillText('实时音频波形', 20, 30);
    
    animationId = requestAnimationFrame(visualizeWaveform);
}

// 模拟发音分析API
async function simulatePronunciationAnalysis(audioBlob, referenceText) {
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 生成模拟分析结果
    const words = referenceText.split(' ');
    const phonemes = targetPhonemes;
    const duration = audioChunks.length * 0.1; // 模拟持续时间
    
    // 为每个单词和音素生成随机分数
    const wordScores = words.map(word => ({
        word,
        accuracy: Math.min(100, Math.floor(Math.random() * 30) + 70), // 70-100
        fluency: Math.min(100, Math.floor(Math.random() * 35) + 65),  // 65-100
        completeness: Math.min(100, Math.floor(Math.random() * 40) + 60) // 60-100
    }));
    
    const phonemeScores = phonemes.map((phoneme, i) => ({
        phoneme,
        accuracy: Math.min(100, Math.floor(Math.random() * 50) + 50), // 50-100
        stress: i % 2 === 0 ? 'correct' : 'incorrect', // 模拟重音模式
        durationRatio: 0.8 + Math.random() * 0.4 // 0.8-1.2
    }));
    
    // 计算整体分数
    const overallAccuracy = Math.floor(wordScores.reduce((sum, ws) => sum + ws.accuracy, 0) / wordScores.length);
    const overallFluency = Math.floor(wordScores.reduce((sum, ws) => sum + ws.fluency, 0) / wordScores.length);
    const overallCompleteness = Math.floor(wordScores.reduce((sum, ws) => sum + ws.completeness, 0) / wordScores.length);
    const pronunciationScore = Math.floor((overallAccuracy * 0.5 + overallFluency * 0.3 + overallCompleteness * 0.2));
    
    return {
        text: referenceText,
        duration,
        pronunciationScore,
        accuracyScore: overallAccuracy,
        fluencyScore: overallFluency,
        completenessScore: overallCompleteness,
        words: wordScores,
        phonemes: phonemeScores,
        feedback: generateFeedback(wordScores, phonemeScores)
    };
}

// 生成反馈信息
function generateFeedback(wordScores, phonemeScores) {
    const feedback = {
        overall: "",
        wordLevel: [],
        phonemeLevel: []
    };
    
    // 整体反馈
    const avgScore = wordScores.reduce((sum, ws) => sum + ws.accuracy, 0) / wordScores.length;
    if (avgScore >= 85) {
        feedback.overall = "发音优秀！只有少量需要改进的地方。";
    } else if (avgScore >= 70) {
        feedback.overall = "发音良好，但有一些需要注意的地方。";
    } else {
        feedback.overall = "需要更多练习，以下方面需要改进:";
    }
    
    // 单词级别反馈
    wordScores.forEach((ws, i) => {
        if (ws.accuracy < 70) {
            feedback.wordLevel.push(`单词"${ws.word}"发音不准确 (得分: ${ws.accuracy})`);
        } else if (ws.accuracy < 85) {
            feedback.wordLevel.push(`单词"${ws.word}"发音可以更好 (得分: ${ws.accuracy})`);
        }
    });
    
    // 音素级别反馈
    const problemPhonemes = phonemeScores.filter(ps => ps.accuracy < 80);
    if (problemPhonemes.length > 0) {
        feedback.phonemeLevel = problemPhonemes.map(ps => 
            `音素 /${ps.phoneme}/ 发音不准确 (得分: ${ps.accuracy})`
        );
    } else {
        feedback.phonemeLevel.push("所有音素发音都很好");
    }
    
    return feedback;
}

// 显示分析结果
function displayAnalysisResults(results) {
    feedbackEl.innerHTML = `
        <h3>发音分析结果</h3>
        <div class="score-display">
            <div class="overall-score" style="color: ${getScoreColor(results.pronunciationScore)}">
                综合评分: ${results.pronunciationScore}/100
            </div>
            <div class="detail-scores">
                <span>准确度: ${results.accuracyScore.toFixed(1)}</span>
                <span>流利度: ${results.fluencyScore.toFixed(1)}</span>
                <span>完整度: ${results.completenessScore.toFixed(1)}</span>
            </div>
        </div>
        
        <h4>总体评价</h4>
        <p>${results.feedback.overall}</p>
        
        ${results.feedback.wordLevel.length > 0 ? `
        <h4>单词级别反馈</h4>
        <ul>
            ${results.feedback.wordLevel.map(item => `<li>${item}</li>`).join('')}
        </ul>
        ` : ''}
        
        <h4>音素级别反馈</h4>
        <div class="phoneme-feedback">
            ${results.phonemes.map(ph => `
                <div class="phoneme-box" style="background-color: ${getPhonemeColor(ph.accuracy)}" 
                     title="/${ph.phoneme}/ - 准确度: ${ph.accuracy}">
                    /${ph.phoneme}/
                </div>
            `).join('')}
        </div>
        
        <ul>
            ${results.feedback.phonemeLevel.map(item => `<li>${item}</li>`).join('')}
        </ul>
        
        <h4>改进建议</h4>
        <p>${getImprovementSuggestions(results)}</p>
    `;
}

// 绘制分析结果
function drawAnalysisResults(results) {
    // 清除分析Canvas
    analysisCtx.clearRect(0, 0, analysisCanvas.width, analysisCanvas.height);
    
    // 绘制分数条
    const startY = 30;
    const barWidth = analysisCanvas.width - 40;
    
    // 绘制背景
    analysisCtx.fillStyle = '#ecf0f1';
    analysisCtx.fillRect(20, startY, barWidth, 20);
    
    // 绘制分数
    analysisCtx.fillStyle = getScoreColor(results.pronunciationScore);
    analysisCtx.fillRect(20, startY, barWidth * (results.pronunciationScore / 100), 20);
    
    // 绘制文本
    analysisCtx.fillStyle = '#2c3e50';
    analysisCtx.font = 'bold 16px Arial';
    analysisCtx.fillText('发音质量', 20, startY - 10);
    
    analysisCtx.font = '14px Arial';
    analysisCtx.textAlign = 'right';
    analysisCtx.fillText(`${results.pronunciationScore}%`, analysisCanvas.width - 20, startY + 15);
    analysisCtx.textAlign = 'left';
    
    // 绘制单词级别的分数
    const wordHeight = 15;
    const wordStartY = startY + 50;
    
    results.words.forEach((word, index) => {
        const y = wordStartY + index * (wordHeight + 5);
        
        // 单词文本
        analysisCtx.fillStyle = '#2c3e50';
        analysisCtx.font = '12px Arial';
        analysisCtx.fillText(word.word, 20, y + wordHeight - 3);
        
        // 分数条背景
        analysisCtx.fillStyle = '#ecf0f1';
        analysisCtx.fillRect(120, y, barWidth - 100, wordHeight);
        
        // 分数条
        analysisCtx.fillStyle = getScoreColor(word.accuracy);
        analysisCtx.fillRect(120, y, (barWidth - 100) * (word.accuracy / 100), wordHeight);
        
        // 分数文本
        analysisCtx.fillStyle = '#2c3e50';
        analysisCtx.font = '12px Arial';
        analysisCtx.textAlign = 'right';
        analysisCtx.fillText(`${word.accuracy}%`, 115, y + wordHeight - 3);
        analysisCtx.textAlign = 'left';
    });
}

// 获取分数对应的颜色
function getScoreColor(score) {
    if (score >= 85) return '#2ecc71'; // 绿色
    if (score >= 70) return '#f39c12'; // 橙色
    return '#e74c3c'; // 红色
}

// 获取音素分数对应的颜色
function getPhonemeColor(score) {
    if (score >= 85) return '#27ae60';
    if (score >= 70) return '#f1c40f';
    return '#e74c3c';
}

// 获取改进建议
function getImprovementSuggestions(results) {
    const lowScorePhonemes = results.phonemes.filter(ph => ph.accuracy < 70);
    
    if (lowScorePhonemes.length > 2) {
        return "您有几个音素发音需要特别注意。建议练习这些音素的单独发音，然后尝试在单词和句子中使用它们。";
    } else if (results.fluencyScore < 70) {
        return "您的流利度需要提高。尝试放慢语速，更清晰地发音每个单词，注意句子中的重音和语调。";
    } else if (results.completenessScore < 80) {
        return "您遗漏或错误发音了一些单词。请仔细听范例发音，注意每个单词的发音。";
    } else {
        return "您的发音已经很好！继续保持，尝试更自然的语调和节奏。";
    }
}

// 初始化
initCanvas();

// 响应式调整Canvas大小
function resizeCanvas() {
    const containerWidth = document.getElementById('appContainer').clientWidth;
    const newWidth = Math.min(800, containerWidth - 40);
    const newHeight = Math.floor(newWidth * 0.25);
    
    waveCanvas.width = newWidth;
    waveCanvas.height = newHeight;
    analysisCanvas.width = newWidth;
    analysisCanvas.height = newHeight;
    
    initCanvas();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();