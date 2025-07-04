//グローバル関数
let currentFilter = {};

//初期化
window.addEventListener("DOMContentLoaded", async () => {
  try {
    // get_tasks() は async 関数 → Promise を返す
    const currentFilter = {};
    const result = await get_tasks(currentFilter);
    renderTasks(result);
  } catch (err) {
    console.error("タスク取得失敗:", err);
  }
});

//DBにあるタスクのデータを取ってくる
//こんときfilterの値も関数の外から取ってくるためにローカル変数でfilterを設定
//flaskサーバーにアクセスして、タスクデータとってきて〜っていうてる。ほんで、app.pyでとってきたtasks(json)を受け取る
async function get_tasks(filterState = {}){
  //urlを分岐させる filterStateが02だった場合、完了済タスクのデータも取ってくる
  let url = "/get_tasks";
  if(filterState.statuses?.includes("02")){
    url += "?include_completed=1"
  }
  //生のデータをjsで扱えるように変換(jsのオブジェクトに変換ともいうらしい)
  const response = await fetch(url);
  const data = await response.json();
  //フィルターボタンを押した時にfilterに引数が渡されてるはず それがなければゼロ
  //もしstatusesの箱の中に数字があったら見に行く、見に行ってなんか数字入ってたら{}内の処理する
  //?がなかったらstatusesの中が何にもなかった時にエラーなる
  if (filterState.statuses?.length) {
    //もとのデータに対してfilterをかける(filterはメソッド)
    data.tasks = data.tasks.filter(
    //taskってのが一個一個のデータの中のまとまりを見ていくメソッド。条件に合えば残す
      task => filterState.statuses.includes(task.statuscode));
  }
  return data;
}
//タスクを表示する
function renderTasks(data){
  const tasks = data.tasks;
  const statuslist = data.statuslist; 
  //htmlのtbodyって箱を見つけてきて、それをtbodyって変数にいれてる
  //getElementByIdじゃない理由は、tbodyっていう特定の場所を呼びだしたいから
  const tbody = document.querySelector("#task-table tbody");
  //trを削除して初期化
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild); 
  }
  //みつけてきたtbodyの箱の中に新しくテーブルの中の1行を作る
  data.tasks.forEach(task => {
    try {
    const tr = document.createElement("tr");   
    //中身のセル作っててセルの名前を決めてる
    const statusTd = document.createElement("td");
    //htmlの中にまずはセレクトタグを新しく作る
    const select = document.createElement("select");
    //さっき作ったselectタグにselectという名前をつけてる
    select.name = task.id;
    select.id = task.id;
    //さらにこのselectタグにCSSクラスをつける(後からいじる時にこれあると便利)
    select.classList.add("task-status");
    //ステータスの状況に対応したCSSクラス作成
    setStatusColorClass(select, task.statuscode);
    //fetchでとってきたstatuslistの中を開いて、プルダウンの選択肢を作る(未着手とか)
    data.statuslist.forEach((statuslist) => { 
      const option = document.createElement("option");
      option.value = statuslist.code;
      //ユーザーに表示される文字列を設定
      option.textContent = statuslist.label;
      //今の状態とマスタのステータスが一致してるか
      if (task.statuscode === statuslist.code) {
        option.setAttribute('selected', '')
      }
      //selectのなかにopitionいれて、selectにtdいれてtrにtdいれてるマトリョーシカ方式
      select.appendChild(option);
    });
    statusTd.appendChild(select);
    //削除ボタン作成(押したときの挙動は別で作る)
    const deleteTd = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';  // ← アイコン付き
    //後から呼び出す用のCSSクラス設定&idの情報も紐づけてSQLで処理するときどれを消すのか迷わんようにしてる
    deleteBtn.classList.add("delete-button");
    deleteBtn.setAttribute("data-id", task.id);
    //このボタンが押されたときの挙動を書いてる関数を呼ぶ
    setDeleteHandler(deleteBtn);
    //今作ったボタンをdeleteTdの小要素にする
    deleteTd.appendChild(deleteBtn);

    //tdを表示させたい項目だけ作ろう！
    const nameTd = document.createElement("td")
    nameTd.innerText = task.name
    const deadlineTd = document.createElement("td")
    deadlineTd.innerText = task.deadline
    const completed_atTd = document.createElement("td")
    completed_atTd.innerText = task.completed_at
    const memoTd = document.createElement("td")
    memoTd.innerText = task.memo
    tr.appendChild(statusTd);
    tr.appendChild(nameTd);
    tr.appendChild(deadlineTd);
    tr.appendChild(completed_atTd);
    tr.appendChild(memoTd);
    tr.appendChild(deleteTd);
    tbody.appendChild(tr);
  }catch(error) {
    console.error("エラー発生:", error);
   } //catchの終わり
  })
}
     //renderTasksの終
//タスクの登録ボタンが押された時に、そのデータをflaskサーバーに送る処理
//fetchで送る前にその送るための情報を受け取って整える作業がいる
//task-fornってIDから情報とってきて欲しい、それはsubmitってイベントが発生した時のみ。ページのリロードもしないように設定（じゃないとfetchの処理の途中でロードはいっちゃうから)
document.getElementById("task-form").addEventListener("submit",function(e){
  e.preventDefault();

  //getElementByIdではそのIDの箇所を探して、valueで探し当てたかしょから情報をとってる
  const name = document.getElementById("task-name").value;
  const deadline = document.getElementById("task-deadline").value;
  const status = document.getElementById("task-status").value;
  const memo = document.getElementById("task-memo").value;

  //valueでとってきたデータを一つにまとめる
  const taskData = {
    name,
    deadline,
    status,
    memo
  };

  //送り出す処理
  fetch("/add-task",{
    //(1)methodでどのような処理をするのか指定。
    // デフォルトはGETなので、GETの場合は省略可能
    method:"Post",
    //(2)heders：サーバーに何を渡すのかの形式を伝える
    headers:{"Content-Type":"application/json"},
    //(3)body：実際にサーバーへ送信する中身（ここでtaskDataがでてきてる）
    body: JSON.stringify(taskData)
    //まとめると・・・
    //データをwebサーバーから受け取ってdbに送る処理をするfetchは以下の3部構成
    //①method どうやって②headers どんなものを③body 何をおくるのか
  })

  //送るとこまではここまででOK
  //サーバーにデータを送るとサーバー側からレスポンスが返ってくるから、それをconsole.logに反映させて、うまく行ったかいってないか判定する
  .then(response => response.json())
  .then(data => {
    console.log("登録成功",data);//【fetchした後にリロードせずに画面更新する関数を入れましょう】
    get_tasks().then(renderTasks);
  })
  .catch(error => {
    console.error("登録失敗:",error);
  });
  });

//▼---フィルター機能：ステータス---▼
function handleFilterApply() {
  //checkedって箱作る
  //querySelectorでhtml上でチェックが入っているものを探してる
  //探してきたデータがNodelistってオブジェクトになってる(html側で未着手=value0とかでで数字も一緒に連れてきてる)
  //「...」でNodelistのデータを展開して配列に変換してる次の処理ができる
  const checked = [...document.querySelectorAll(".status-check:checked")]
  //配列の中からvalue(ステータスコード)だけを抽出して、statusesって箱に入れてる
  .map(cb => cb.value);
  currentFilter = {statuses: checked };
  get_tasks(currentFilter).then(renderTasks);
}

//フィルターの確認ボタンが押された時に関数が走る
document.getElementById("applyStatusFilter").addEventListener("click", handleFilterApply);
//▲---フィルター機能：ステータス---▲

//ユーザーがタスクのテーブルのステータスの状態を変更したら送られる処理
//HTML内のtbodyを探し、その中でchangeイベントが起こったら以下の処理するよ
document.querySelector("tbody").addEventListener("change", (event) => {
//tasuk-statusって名前をつけたセレクトボタンん胃発生したeventだけに反応して欲しい
  if(event.target.classList.contains("task-status")){
    const tr = event.target.closest("tr");
    //イベントターゲットつまり、今回変更を加えられたデータのIDをとりに行っている
    const taskId = event.target.getAttribute("id");
    //今選択されている値(画面上は進行中とかだけど裏では00)をとってきてる
    const newStatus = event.target.value;
    //色変更
    setStatusColorClass(event.target, newStatus);
    //Flaskに送るぜ！の処理
    fetch(`/update-status/${taskId}`,{
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        statuscode:newStatus,
        //ステータスが完了の場合は、完了日をデータに追加して送る
          //...(条件) 条件がtrueの時のみ展開する
          //toISOString タイムスタンプを取得
        ...(newStatus === "02" && { completed_at: new Date().toISOString()})
      }),
    }) //fetchの終
    //fetchの送信がうまく行ったかチェック
    .then(response => {
      if(!response.ok) {
        throw new Error("サーバーエラーが発生しました");
      }
      return response.json();
    }) //then1の終
    .then(data => {
      console.log("登録成功:", data.message || "OK");
      //ステータスが完了のものをテーブルから削除
      if(newStatus === "02") {
        tr.remove();
      }
    }) //then2の終
    .catch(error =>{
      console.error("更新失敗", error);
      alert("ステータスの更新に失敗しました");
    }); //catchの終
  };//ifの終
});//addEventLisnerの終

//削除ボタンが押されたときの処理
function setDeleteHandler(buttonElement){
  buttonElement.addEventListener("click", () => {
    //削除ボタン作った時に紐付けといたidを確認しに行ってる
    const taskId = buttonElement.getAttribute("data-id");
    //削除がキャンセルされたときの処理 confirmがfalse=キャンセル true=イエス falseのときはreturnで処理止まる
    if(!confirm("本当に削除しますか？")) return;
    //confirmがtrueの時の処理
    fetch(`/delete-task/${taskId}`,{
      method: "DELETE",
    }) //Fetchの終
      .then((res) => {
        if(!res.ok) throw new Error("削除失敗"); //サーバーからのレスがok以外ならエラーだす
        get_tasks(currentFilter).then(renderTasks); //サーバーからのレスがyesならタスクを再取得
      }) //then1の終
    .catch((err) => {
      console.error("削除エラー:", err);
      alert("タスクの削除に失敗しました");
    }); //catchの終
  }); //Eventlisnerの終
} //functionの終

//ステータスに応じて動的に色を帰る処理用のcssクラスの作成
function setStatusColorClass(select, statuscode){
  //ステータスクラスを初期化
  select.classList.remove("status-not-started", "status-in-progress", "status-completed");

    // 数字でも文字でも対応（"01" or 1）
  const code = String(statuscode).padStart(2, "0");

  //ステータスのクラスを追加
  if (code === "00") {
      select.classList.add("status-not-started");
  } else if (code === "01") {
      select.classList.add("status-in-progress");
  } else if (code === "02") {
      select.classList.add("status-completed");
}
}

//▼---ソート機能---▼
//ソートボタンからvalueを取ってくる処理
function applySort(){
  const key = document.getElementById("sortKey").value;
  const order = document.getElementById("sortOrdet").value;

  sortTasks(sortKey, sortOrder); 
}

//表示されてるタスクにソートをかける機能
function sortTasks(filterState = {}){
  //フィルタの状態をHTMLから取得
  const checked = [...document.querySelectorAll(".status-check:checked")]
  .map(cb => cb.value);
  currentFilter = {statuses: checked };

  //処理のための材料をHTMLから受け取る下準備
  const sortKey = document.getElementById("sortKey").value;
  const sortOrder = document.getElementById("sortOrder").value;

  get_tasks(currentFilter).then(result => {
    //sortはデータの中身を一個一個比較して並び替える()内のaとbで。
    // そのabをtasksの中から取り出すときに何をキーにして探すのか指定してる。
    const tasks = result.tasks;  //tasksの中から配列のみ取り出す
    const statuslist = result.statuslist;

    if (!Array.isArray(tasks)) {
    console.error("tasksが配列じゃない！", tasks);
    return;
    }

    tasks.sort((a, b) => {
      const aValue = a[sortKey]; //const xxx = a["データベースのカラム名" = "htmlでかいたvalue"]
      const bValue = b[sortKey];

      //タスク期限がsortKeyだった場合
      if(sortKey === 'deadline') {
        return sortOrder == 'asc'
          ? new Date(aValue) - new Date(bValue) //ascがtrueなら実行される 昇順
          : new Date(bValue) - new Date(aValue) ////ascがfalseつまりdescの場合実行される
      }

      return 0; //ソートキーが不明なとき
    }); //tasks.sortの終

    renderTasks({tasks, statuslist});
  })//get_tasks.thenの終
} //sortTasksの終
//ボタンが押された時に処理が走る
document.getElementById("sortButton").addEventListener("click",sortTasks)
//▲---ソート機能---▲

//▼---CSVエクスポート機能---▼
function exportTableToCSV(filename) {
  const table = document.getElementById("task-table");
  //テーブルからデータを抽出して、jsで処理しやすい配列に変換
    //Array：NodeListを配列に変える
    //querySelectorAll：tableにある要素をNodelistに変換する
  const rows = Array.from(table.querySelectorAll("tr"));

  //テーブルの全行をループ→セルずつテキストを取り出し→CSV形式の文字列に変換する
    //配列.map(（要素） => { return 加工して返すもの })
  const csv = rows.map(row => {
    //1行取ってきてるので、行の中のセルと見出しを配列にしてる
    const cols = Array.from(row.querySelectorAll("th, td"));
    //配列化したセルを加工
      //cell.innerText：セル要素の中のテキストだけを抽出（=</td> とかのタグを取り出さない）
      //replace:(もし"があったら,""にして)
      //join()処理した配列の間にいれる
      //`$： " + セルの中のテキスト + " = "タスク名"
    return cols.map(cell => `"${cell.innerText.replace(/"/g, '""')}"`).join(",")
  }).join("\n"); //すべてのセルを処理終わったら改行

  //CSV文字列をファイルとしてダウンロード可能な状態に変換
    //Blob：[変換前データ].{変換後データ}
    //\uFEFFとcsvをくっつけて、文字化け防止(日本語の場合これがないと文字化けしやすい)
    //type：このデータがなんのファイル？ charaset：文字コード
  const blob = new Blob(["\uFEFF" + csv], { type: "tex/csv;charset=utf-8;"});
  
  //CSVファイルを一時的にダウンロードリンクに変換
    //webサーバーのメモリ内にあるファイルのアドレスを作る=一時的なローカルURL
  const url = URL.createObjectURL(blob);

  //ダウンロードリンクの要素を作成
  const a = document.createElement("a"); //<a>タグ作る
  a.href = url; //<a>タグにhref属性を追加して、<a href="url">にしてる 何をダウンロードするのか決める
  a.download = "tasks.csv"; //<a href="url" download = "ファイル名を指定">にしてる

  document.body.appendChild(a); //一瞬だけaタグを画面に追加
  a.click(); //jsに自動でクリックしてもらう
  document.body.removeChild(a); //タグを削除
}
//▲---CSVエクスポート機能---▲