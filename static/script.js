window.addEventListener("load", function(){
  get_tasks()
})

//DBにあるタスクのデータを取ってきて表示する
//flaskサーバーにアクセスして、タスクデータとってきて〜っていうてる。ほんで、app.pyでとってきたtasks(json)を受け取る
function get_tasks(){
  fetch("/get_tasks")
    //生のデータをjsで扱えるように変換(jsのオブジェクトに変換ともいうらしい)
    .then(response => response.json())

    //htmlのtbodyって箱を見つけてきて、それをtbodyって変数にいれてる
    //getElementByIdじゃない理由は、tbodyっていう特定の場所を呼びだしたいから
    .then(data => {
      // console.log(data) データの中身見たいとき
      const tbody = document.querySelector("#task-table tbody");
      //trを削除して初期化
      while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild); 
      }
      //みつけてきたtbodyの箱の中に新しくテーブルの中の1行を作る
      data.tasks.forEach(task => {
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
        deleteBtn.textContent = "削除";
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
      });
  
    })
    .catch(error => {
      console.error("エラー発生:", error);
    });
}
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
    get_tasks();
  })
  .catch(error => {
    console.error("登録失敗:",error);
  });
  });

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
      //Flaskに送るぜ！の処理
      fetch(`/update-status/${taskId}`,{
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({statuscode:newStatus}),
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
          buttonElement.closest("tr").remove(); //サーバーからのレスがyesならボタンが属してるtr(行)を丸ごと削除
        }) //then1の終
      .catch((err) => {
        console.error("削除エラー:", err);
        alert("タスクの削除に失敗しました");
      }); //catchの終
    }); //Eventlisnerの終
  } //functionの終
  //git更新確認
  //追加コメントです