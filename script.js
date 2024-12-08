let mode = null; // "cash" or "cashless"
let money = 0; // スタートは借金しているので実質0から開始
const loan = 100000; // 借入額
const rent = 10000; // 家賃
const interest = 1000; // 利子(毎ターン)
const otherCost = 2000; // 諸費用(毎ターン)
let turnCount = 0; // 全部で何ターン遊ぶか
let currentTurn = 0; 
let pricePerDish = 500; // 初期価格(後で変更可能)
let dishesSold = 0; // 売れた皿数
let ingredientCost = 0; // 材料費(一度決めたら固定)
let showMoney = true; // 表示非表示を切り替え
let controlsElement, statusElement;

// 材料リスト（名前と価格）
const ingredients = [
    {name:"お米(400円)", price:400},
    {name:"牛肉 国産(3000円)", price:3000},
    {name:"牛肉 外国産(2500円)", price:2500},
    {name:"なす(500円)", price:500},
    {name:"トマト(500円)", price:500},
    {name:"まいたけ(500円)", price:500},
    {name:"鶏肉(1500円)", price:1500},
    {name:"ブタニク(2000円)", price:2000},
    {name:"ほたて(1500円)", price:1500},
    {name:"カレールー(1000円)", price:1000},
    {name:"カレールー 高級外国産(2000円)", price:2000},
    {name:"ハチミツ(500円)", price:500},
    {name:"たまねぎ(1000円)", price:1000},
    {name:"人参(1000円)", price:1000},
    {name:"じゃがいも(1000円)", price:1000},
    {name:"ヨーグルト(500円)", price:500},
    {name:"エビ(2000円)", price:2000},
    {name:"ほうれん草(500円)", price:500},
    {name:"しょうが(500円)", price:500},
    {name:"ピーマン(500円)", price:500}
];

// 天気イベント (サイコロで決定)
const weatherEvents = [
    {roll:[2], name:"台風", multiplier:0}, //休業
    {roll:[3], name:"大雨", multiplier:0.5}, 
    {roll:[4], name:"雨", multiplier:0.7},
    {roll:[5,6], name:"曇り", multiplier:0.9},
    {roll:[7,8,9,10], name:"晴れ", multiplier:1.0},
    {roll:[11,12], name:"快晴", multiplier:1.2}
];

// 経済イベント(ランダムピック)
const economicEvents = [
    {name:"インフレ", effect: () => { 
        // 価格高い商品が売れやすい+10皿（500円以上なら+10皿、500円以下なら+0皿）
        if (pricePerDish > 500) return {salesMod:10}; else return {salesMod:0};
    }},
    {name:"デフレ", effect: () => {
        // 500円以下+20皿、500円より高いと-20皿
        if (pricePerDish <= 500) return {salesMod:20}; else return {salesMod:-20};
    }},
    {name:"好景気", effect: () => { return {salesMod:30}; }},
    {name:"不景気", effect: () => {
        // 500円以下:+10皿、500円超え:-10皿
        if (pricePerDish <= 500) return {salesMod:10}; else return {salesMod:-10};
    }},
    {name:"ハッカー(キャッシュレスだとダメージ)", effect: () => {
        if (mode === "cashless") return {moneyChange:-20000}; 
        else return {}; 
    }},
    {name:"どろぼう(現金だとダメージ)", effect: () => {
        if (mode === "cash") return {moneyChange:-5000};
        else return {};
    }},
    {name:"増税", effect: () => {
        // 材料費+500、家賃+500
        return {rentUp:500, ingredientUp:500};
    }},
    {name:"エネルギー価格下落", effect: () => {
        // 材料費-1000
        return {ingredientUp:-1000};
    }},
    {name:"輸入規制強化", effect: () => {
        // 材料費+2000
        return {ingredientUp:2000};
    }},
    {name:"SNSでバズる", effect: () => {
        // +20皿売れる
        return {salesMod:20};
    }}
];

window.onload = () => {
    statusElement = document.getElementById("status");
    controlsElement = document.getElementById("controls");
    initGame();
};

function initGame() {
    showStatus("いらっしゃいませ！カレー屋さんを経営しましょう。");
    showModeSelection();
}

function showStatus(msg) {
    let dispMoney = showMoney ? `残金: ${money}円` : "残金: ???円";
    statusElement.textContent = dispMoney + " | " + msg;
}

function showModeSelection() {
    controlsElement.innerHTML = "";
    showStatus("まずは支払い方法を選んでください。");

    const p = document.createElement("p");
    p.textContent = "どちらでお客さんからお金を受け取りますか？";
    controlsElement.appendChild(p);

    const btnCash = createButton("現金モード(入金即時・手数料なし)", () => {
        mode = "cash";
        money = 0; // 借入(100,000円)を受け取る
        money += loan; 
        showStatus("現金モードでスタート！ 100,000円借りました。");
        showTurnCountSelection();
    });
    const btnCashless = createButton("キャッシュレスモード(翌月入金・5%手数料)", () => {
        mode = "cashless";
        money = 0; // 借入(100,000円)を受け取る
        money += loan;
        showStatus("キャッシュレスモードでスタート！ 100,000円借りました。");
        showTurnCountSelection();
    });

    controlsElement.appendChild(btnCash);
    controlsElement.appendChild(btnCashless);
}

function showTurnCountSelection() {
    controlsElement.innerHTML = "";
    showStatus("何ターン遊びますか？");
    const p = document.createElement("p");
    p.textContent = "1ターンは、費用支払い→天気決定→経済イベント→販売です。";
    controlsElement.appendChild(p);

    const input = document.createElement("input");
    input.type = "number";
    input.min = 1;
    input.value = 5; //デフォルト5ターン
    const label = document.createElement("label");
    label.textContent = "ターン数：";
    label.appendChild(input);
    controlsElement.appendChild(label);

    const btnNext = createButton("決定", () => {
        turnCount = parseInt(input.value);
        showStatus(turnCount + "ターンでプレイします。");
        showIngredientSelection();
    });
    controlsElement.appendChild(btnNext);
}

function showIngredientSelection() {
    controlsElement.innerHTML = "";
    showStatus("材料を選んでください。(合計1万円以内)");
    const p = document.createElement("p");
    p.textContent = "使いたい材料にチェックしてください。合計金額1万円以内で選んでください。";
    controlsElement.appendChild(p);

    const div = document.createElement("div");
    div.id="ingredients-list";
    ingredients.forEach((ing, idx) => {
        const lbl = document.createElement("label");
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.value = ing.price;
        chk.onchange = updateIngredientTotal;
        lbl.appendChild(chk);
        lbl.appendChild(document.createTextNode(ing.name));
        div.appendChild(lbl);
    });
    controlsElement.appendChild(div);

    const totalP = document.createElement("p");
    totalP.id = "ingredient-total";
    totalP.textContent = "合計: 0円";
    controlsElement.appendChild(totalP);

    const btnNext = createButton("決定", () => {
        if (ingredientCost > 10000) {
            showStatus("1万円以内におさえてください。");
        } else if (ingredientCost === 0) {
            showStatus("材料がゼロです。少なくとも1つは選んでください。");
        } else {
            showPriceSelection();
        }
    });
    controlsElement.appendChild(btnNext);

    function updateIngredientTotal() {
        const checks = div.querySelectorAll("input[type=checkbox]");
        let sum = 0;
        checks.forEach(c => {
            if(c.checked) sum += parseInt(c.value);
        });
        ingredientCost = sum;
        totalP.textContent = "合計: " + sum + "円";
    }
}

function showPriceSelection() {
    controlsElement.innerHTML = "";
    showStatus("価格を決めてください。(300円～800円)");

    const p = document.createElement("p");
    p.textContent = "1皿あたりの販売価格を決めてください。(初期は500円)";
    controlsElement.appendChild(p);

    const input = document.createElement("input");
    input.type = "number";
    input.min = 300;
    input.max = 800;
    input.value = 500;
    const label = document.createElement("label");
    label.textContent = "1皿の値段：";
    label.appendChild(input);
    controlsElement.appendChild(label);

    const btnNext = createButton("決定", () => {
        const val = parseInt(input.value);
        if (val < 300 || val > 800) {
            showStatus("300～800円の範囲で決めてください。");
        } else {
            pricePerDish = val;
            showStatus("1皿 " + val + "円で決定しました。");
            startGame();
        }
    });
    controlsElement.appendChild(btnNext);
}

function startGame() {
    currentTurn = 0;
    nextTurn();
}

function nextTurn() {
    if (currentTurn >= turnCount) {
        endGame();
        return;
    }
    currentTurn++;
    processTurn();
}

function processTurn() {
    controlsElement.innerHTML = "";
    showStatus(currentTurn + "ターン目！");

    // 1. 費用支払い(材料費は初回のみ)
    let cost = 0;
    if (currentTurn === 1) cost += ingredientCost;
    cost += rent;
    cost += interest;
    cost += otherCost;

    // キャッシュレスの場合、売上は前ターンの売上があれば5%手数料引きで入金、だが簡略化するため
    // 本ゲームは即時売上計上＋翌月入金を再現せず、手数料をここで単純化することもできるが、
    // 指示に忠実に、キャッシュレスは入金遅れを表現するため、ここでは売上獲得を遅らせる仕組みを入れる
    // しかし要望には「翌月入金」とあるので、ターンが短い中で実装が複雑になる。
    // 簡易対応として以下ルール:
    // キャッシュレスの場合、今ターンで得た売上は次のターン開始時に入る、として売上をバッファに貯める
    // 5%引いて入れる仕組みを実装する
    if (mode === "cashless") {
        // 前ターンで貯めた売上を今反映
        money += Math.floor(pendingSales * 0.95);
        pendingSales = 0;
    }

    // 支払い実行
    money -= cost;

    // 2. 天気決定
    const weatherRoll = rollDice(2);
    const weather = getWeatherEvent(weatherRoll);
    // 3. 経済イベント
    const econ = getEconomicEvent();

    // 販売数計算(標準は100皿、価格によって変動)
    // 簡易ルール：標準100皿販売
    // 価格高いほど売れにくくしたいが、経済イベントですでに調整しているので一旦そのまま
    let baseSales = 100;
    // 価格による調整：たとえば500円標準。100円上がるごとに-10皿、100円下がるごとに+10皿(簡易)
    let priceDiff = pricePerDish - 500;
    let priceAdjust = Math.floor(priceDiff/100)*(-10);
    // 天気による倍率
    let sales = Math.floor((baseSales + priceAdjust) * weather.multiplier);

    // 経済イベントによる調整
    if (econ.salesMod) sales += econ.salesMod;

    if (sales < 0) sales = 0;

    // 売上計算
    let salesAmount = sales * pricePerDish;

    // キャッシュレスの場合、売上は即入らずpending
    if (mode === "cash") {
        money += salesAmount;
    } else {
        // 来ターンに入金
        pendingSales = salesAmount;
    }

    // 経済イベントによるお金の増減
    if (econ.moneyChange) {
        money += econ.moneyChange;
    }

    // 増税や輸入規制によるコスト上昇を今後のターンに反映するため、
    // ingredientCostやrentを上げる対応
    if (econ.ingredientUp) {
        ingredientCost += econ.ingredientUp;
        if (ingredientCost < 0) ingredientCost = 0; 
    }
    if (econ.rentUp) {
        // 次ターン以降家賃値上げ
        rent += econ.rentUp;
    }

    // 表示領域
    const info = document.createElement("p");
    info.innerHTML = `<strong>${currentTurn}ターン目の結果</strong><br>
    天気: ${weather.name}<br>
    経済イベント: ${econ.name}<br>
    今回支払い合計: ${cost}円<br>
    販売皿数: ${sales}皿<br>
    売上: ${salesAmount}円(${mode==="cashless"?"※次ターン入金(5%手数料後)":"即時入金"})<br>
    `;
    controlsElement.appendChild(info);

    // 表示/非表示ボタン
    const toggleBtn = createButton(showMoney ? "残金を隠す" : "残金を表示", () => {
        showMoney = !showMoney;
        showStatus(`${currentTurn}ターン目が終わりました`);
    });
    controlsElement.appendChild(toggleBtn);

    // 次のターンへ
    const nextBtn = createButton(currentTurn<turnCount?"次のターンへ":"結果を見る", () => {
        nextTurn();
    });
    controlsElement.appendChild(nextBtn);
}

// キャッシュレス用の売上バッファ
let pendingSales = 0;

function endGame() {
    controlsElement.innerHTML = "";
    showStatus("ゲーム終了！");
    const p = document.createElement("p");
    p.textContent = `全${turnCount}ターン終了。最終的な残金は${money}円でした。`;
    controlsElement.appendChild(p);
}

// 天気を決める
function getWeatherEvent(rollSum) {
    for (let w of weatherEvents) {
        if (w.roll.includes(rollSum)) {
            return w;
        }
        // たとえば5,6が曇りのように複数値の場合、includesで判定
    }
    return {name:"晴れ", multiplier:1.0};
}

function rollDice(count) {
    let sum = 0;
    for (let i=0;i<count;i++){
        sum += Math.floor(Math.random()*6)+1;
    }
    return sum;
}

// 経済イベントランダム取得
function getEconomicEvent() {
    const e = economicEvents[Math.floor(Math.random()*economicEvents.length)];
    let res = e.effect();
    if(!res) res = {};
    return {name:e.name, ...res};
}

function createButton(label, onClick) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = onClick;
    return btn;
}
