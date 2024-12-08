let mode = null; // "cash" or "cashless"
let prMode = false; // 広報モードON/OFF
let money = 0; 
const loan = 100000; 
let interestRate = 1000; // 利子
let rent = 10000;
let otherCost = 2000;
let ingredientCost = 0; 
let turnCount = 0; 
let currentTurn = 0; 
let pricePerDish = 500; 
let showMoney = true; 
let showSalesDetail = false;
let pendingSales = 0;
let selectedIngredients = [];

let controlsElement, statusElement, selectedInfoElement, historyElement;

// ターンごとの履歴を記録する配列
let turnHistory = [];

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

const weatherEvents = [
    {roll:[2], name:"台風", multiplier:0},
    {roll:[3], name:"大雨", multiplier:0.5},
    {roll:[4], name:"雨", multiplier:0.7},
    {roll:[5,6], name:"曇り", multiplier:0.9},
    {roll:[7,8,9,10], name:"晴れ", multiplier:1.0},
    {roll:[11,12], name:"快晴", multiplier:1.2}
];

const economicEvents = [
    {name:"インフレ", desc:"物価上昇で高価格商品が売れやすくなる", effect: (price) => { 
        if (price > 500) return {salesMod:10};
        return {};
    }},
    {name:"デフレ", desc:"物価下落で安い商品が売れやすく、高い商品が売れにくい", effect: (price) => {
        if (price <= 500) return {salesMod:20}; else return {salesMod:-20};
    }},
    {name:"好景気", desc:"経済好調で多くの人が買い物をする", effect: () => { return {salesMod:30}; }},
    {name:"不景気", desc:"経済不調で節約ムード", effect: (price) => {
        if (price <= 500) return {salesMod:10}; else return {salesMod:-10};
    }},
    {name:"ハッカー", desc:"キャッシュレス決済システムへの攻撃", effect: () => {
        if (mode === "cashless") return {moneyChange:-20000}; 
        else return {}; 
    }},
    {name:"どろぼう", desc:"現金が盗まれる", effect: () => {
        if (mode === "cash") return {moneyChange:-5000};
        else return {};
    }},
    {name:"増税", desc:"税率上昇で家賃や材料費アップ", effect: () => {
        return {rentUp:500, ingredientUp:500};
    }},
    {name:"エネルギー価格下落", desc:"輸送コスト減、材料費ダウン", effect: () => {
        return {ingredientUp:-1000};
    }},
    {name:"輸入規制強化", desc:"海外材料が高騰", effect: () => {
        return {ingredientUp:2000};
    }},
    {name:"SNSでバズる", desc:"評判が広がり客増", effect: () => {
        return {salesMod:20};
    }}
];

window.onload = () => {
    statusElement = document.getElementById("status");
    controlsElement = document.getElementById("controls");
    selectedInfoElement = document.getElementById("selected-info");
    historyElement = document.getElementById("history");
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
    showStatus("はじめにモードを選んでください。");

    const p = document.createElement("p");
    p.textContent = "以下の設定を選んでゲーム開始します。";
    controlsElement.appendChild(p);

    // 現金・キャッシュレス選択
    const modeLabel = document.createElement("label");
    modeLabel.textContent = "支払いモード：";
    const modeSelect = document.createElement("select");
    const optCash = document.createElement("option");
    optCash.value="cash"; optCash.text="現金";
    const optCashless = document.createElement("option");
    optCashless.value="cashless"; optCashless.text="キャッシュレス";
    modeSelect.appendChild(optCash);
    modeSelect.appendChild(optCashless);
    modeLabel.appendChild(modeSelect);
    controlsElement.appendChild(modeLabel);

    // 広報モード
    const prLabel = document.createElement("label");
    prLabel.textContent = "広報モード(売上+10%)：";
    const prCheck = document.createElement("input");
    prCheck.type="checkbox";
    prLabel.appendChild(prCheck);
    controlsElement.appendChild(prLabel);

    // 利子設定
    const interestLabel = document.createElement("label");
    interestLabel.textContent = "利子(元々1000円+入力値)：";
    const interestInput = document.createElement("input");
    interestInput.type="number";
    interestInput.value=1000; //デフォルト1000円
    interestLabel.appendChild(interestInput);
    controlsElement.appendChild(interestLabel);

    const btnNext = createButton("決定", () => {
        mode = modeSelect.value;
        prMode = prCheck.checked;
        interestRate = parseInt(interestInput.value);
        money = 0;
        money += loan; 
        showStatus("借入100,000円完了。モード設定完了。");
        showTurnCountSelection();
    });
    controlsElement.appendChild(btnNext);
}

function showTurnCountSelection() {
    controlsElement.innerHTML = "";
    showStatus("何ターン遊びますか？");

    const p = document.createElement("p");
    p.textContent = "1ターン：費用支払い→天気→経済イベント→販売→(キャッシュレスは次ターン入金)";
    controlsElement.appendChild(p);

    const input = document.createElement("input");
    input.type = "number";
    input.min = 1;
    input.value = 5;
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
    p.textContent = "使いたい材料にチェックしてください。合計10,000円以内";
    controlsElement.appendChild(p);

    const div = document.createElement("div");
    div.id="ingredients-list";
    ingredients.forEach((ing) => {
        const lbl = document.createElement("label");
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.value = ing.price;
        chk.dataset.name = ing.name;
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
        selectedIngredients = [];
        checks.forEach(c => {
            if(c.checked) {
                sum += parseInt(c.value);
                selectedIngredients.push(c.dataset.name);
            }
        });
        ingredientCost = sum;
        totalP.textContent = "合計: " + sum + "円";
    }
}

function showPriceSelection() {
    controlsElement.innerHTML = "";
    showStatus("価格を決めてください。(300円～800円)");

    const p = document.createElement("p");
    p.textContent = "1皿あたりの販売価格を入力(初期500円)";
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
    pendingSales = 0;
    turnHistory = [];
    updateSelectedInfo();  
    renderHistory();
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
    showStatus(`${currentTurn}ターン目です。`);

    let cost = 0;
    if (currentTurn === 1) cost += ingredientCost;
    let thisTurnInterest = interestRate; 
    cost += rent;
    cost += thisTurnInterest;
    cost += otherCost;

    if (mode === "cashless" && currentTurn > 1) {
        money += Math.floor(pendingSales * 0.95);
        pendingSales = 0;
    }

    money -= cost;

    const weatherRoll = rollDice(2);
    const weather = getWeatherEvent(weatherRoll);
    const econ = getEconomicEvent();

    // 販売数計算
    // 基本100皿
    // priceDiff = (pricePerDish - 500), 100円増で-10皿、100円減で+10皿
    let baseSales = 100;
    let priceDiff = pricePerDish - 500;
    let priceAdjust = Math.floor(priceDiff/100)*(-10);
    let sales = baseSales + priceAdjust;
    sales = Math.floor(sales * weather.multiplier);
    if (econ.salesMod) sales += econ.salesMod;
    if (prMode) sales = Math.floor(sales * 1.1);
    if (sales < 0) sales = 0;

    let salesAmount = sales * pricePerDish;
    if (mode === "cash") {
        money += salesAmount;
    } else {
        pendingSales += salesAmount;
    }

    if (econ.moneyChange) {
        money += econ.moneyChange;
    }

    if (econ.ingredientUp) {
        ingredientCost += econ.ingredientUp;
        if (ingredientCost<0) ingredientCost=0;
    }
    if (econ.rentUp) {
        rent += econ.rentUp;
    }

    const info = document.createElement("p");
    info.innerHTML = `<strong>${currentTurn}ターン結果</strong><br>
    ●支払い合計: ${cost}円<br>
    (内訳:材料費(${currentTurn===1?ingredientCost:0}円)+家賃(${rent-(econ.rentUp||0)}円)+利子(${thisTurnInterest}円)+諸費用(${otherCost}円))<br>
    ●天気: ${weather.name}(倍率:${weather.multiplier})<br>
    ●経済イベント: ${econ.name} <button onclick="showEventDesc('${econ.desc}')">説明</button><br>
    ●販売皿数:${sales}皿`;
    controlsElement.appendChild(info);

    const salesDetailBtn = document.createElement("button");
    salesDetailBtn.className = "eye-btn";
    salesDetailBtn.textContent = showSalesDetail ? "売上計算隠す" : "売上計算見る";
    salesDetailBtn.onclick = () => {
        showSalesDetail = !showSalesDetail;
        updateSalesDetail(sales, priceAdjust, weather, econ, salesAmount);
    };
    controlsElement.appendChild(salesDetailBtn);

    const salesDetailP = document.createElement("p");
    salesDetailP.id = "sales-detail";
    controlsElement.appendChild(salesDetailP);
    updateSalesDetail(sales, priceAdjust, weather, econ, salesAmount);

    function updateSalesDetail(sales, priceAdjust, weather, econ, salesAmount) {
        if (showSalesDetail) {
            salesDetailP.innerHTML = `売上計算式:<br>
            基本100皿 + 価格差調整(${priceAdjust}皿) = ${100+priceAdjust}皿<br>
            天気倍率 ×${weather.multiplier}<br>
            経済イベント調整:${econ.salesMod||0}皿<br>
            広報モード:${prMode?"+10%": "なし"}<br>
            最終販売数:${sales}皿<br>
            売上= ${sales}皿 × ${pricePerDish}円 = ${salesAmount}円<br>
            ${mode==="cash"?"(即時入金)":"(次ターン入金,5%手数料後)"}`;
        } else {
            salesDetailP.textContent = "";
        }
    }

    const toggleMoneyBtn = createButton(showMoney ? "残金を隠す" : "残金を表示", () => {
        showMoney = !showMoney;
        showStatus(`${currentTurn}ターン終了`);
    });
    controlsElement.appendChild(toggleMoneyBtn);

    const nextBtn = createButton(currentTurn<turnCount?"次のターンへ":"結果を見る", () => {
        // ターン履歴記録
        recordTurnHistory(currentTurn, weather, econ, sales, salesAmount, money);
        renderHistory();
        nextTurn();
    });
    controlsElement.appendChild(nextBtn);
}

function endGame() {
    controlsElement.innerHTML = "";
    showStatus("ゲーム終了！");
    const p = document.createElement("p");
    p.textContent = `全${turnCount}ターン終了。最終的な残金は${money}円でした。`;
    controlsElement.appendChild(p);
}

function updateSelectedInfo() {
    selectedInfoElement.classList.remove("hidden");
    selectedInfoElement.innerHTML = `<strong>選択した材料:</strong><br>${selectedIngredients.join(", ")}<br>
    材料合計:${ingredientCost}円 / 1皿:${pricePerDish}円`;
}

function recordTurnHistory(turn, weather, econ, sales, salesAmount, moneyEnd) {
    turnHistory.push({
        turn: turn,
        weather: weather.name,
        event: econ.name,
        sales: sales,
        revenue: salesAmount,
        moneyEnd: moneyEnd
    });
}

function renderHistory() {
    historyElement.innerHTML = "";
    if (turnHistory.length > 0) {
        const h2 = document.createElement("h2");
        h2.textContent = "ターン履歴";
        historyElement.appendChild(h2);

        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const trh = document.createElement("tr");
        ["ターン","天気","イベント","販売数","売上","残金"].forEach(hd => {
            const th = document.createElement("th");
            th.textContent = hd;
            trh.appendChild(th);
        });
        thead.appendChild(trh);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        turnHistory.forEach(h => {
            const tr = document.createElement("tr");
            const tdTurn = document.createElement("td");tdTurn.textContent=h.turn;
            const tdWeather = document.createElement("td");tdWeather.textContent=h.weather;
            const tdEvent = document.createElement("td");tdEvent.textContent=h.event;
            const tdSales = document.createElement("td");tdSales.textContent=h.sales;
            const tdRevenue = document.createElement("td");tdRevenue.textContent=h.revenue;
            const tdMoney = document.createElement("td");tdMoney.textContent=h.moneyEnd;
            tr.appendChild(tdTurn);
            tr.appendChild(tdWeather);
            tr.appendChild(tdEvent);
            tr.appendChild(tdSales);
            tr.appendChild(tdRevenue);
            tr.appendChild(tdMoney);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        historyElement.appendChild(table);
    }
}

function getWeatherEvent(rollSum) {
    for (let w of weatherEvents) {
        if (w.roll.includes(rollSum)) {
            return w;
        }
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

function getEconomicEvent() {
    const e = economicEvents[Math.floor(Math.random()*economicEvents.length)];
    let res = e.effect(pricePerDish);
    if(!res) res = {};
    return {name:e.name, desc:e.desc, ...res};
}

function createButton(label, onClick) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = onClick;
    return btn;
}

function showEventDesc(txt) {
    const modal = document.getElementById("modal");
    const modalText = document.getElementById("modal-text");
    const closeBtn = document.getElementById("modal-close");
    modal.classList.remove("hidden");
    modalText.textContent = txt;
    closeBtn.onclick = () => {
        modal.classList.add("hidden");
    }
}
