import psycopg2
from flask import Flask, render_template, request, jsonify
from db import get_connection  

app = Flask(__name__)

@app.route("/")
def index():
    status_options = get_statusnumber()
    return render_template("index.html", status_options=status_options) #左がhtml 右がapp.pyの中の処理

#htmlのタスクの登録ボタンのstatusの選択肢がdbと連携させるための処理
#app.routeじゃなくていいのはfetchがいらんから
#ここ書き直し必要そうfetchで受け取れるように修正するとこの機能使いまわせるから
def get_statusnumber():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT code, label FROM statusnumber;")
    rows = cur.fetchall()
    #HTMLで扱いやすくするために、データの番号とそれに対応する名前(codeとかlabel)をつけてる
    rows = [{"code": r[0], "label": r[1]} for r in rows]
    cur.close()
    conn.close()
    return rows

#htmlでdbに登録されてるタスクを全件取得し、表示する
@app.route('/get_tasks')
def get_tasks():
    try:
        conn = get_connection()

        # 接続を通じて命令を出してくれる人（作業員）」を用意=カーソル作成
        cur = conn.cursor()
        
        #分岐(未着手/進行中のみverと完了済みも含むver)ULRの?以前が一致してたらこの処理走る
        #変数の箱にURLの?以降のパラメータを入れる
        include_completed = request.args.get("include_completed") #
        if include_completed == "1":
            sql = """
                SELECT * FROM tasks
                LEFT JOIN statusnumber ON status = code
                WHERE is_deleted = '0'
                ORDER BY completed_at DESC;
            """
        else:
            sql = """
                SELECT * FROM tasks
                LEFT JOIN statusnumber ON status = code
                WHERE is_deleted = '0' AND status IN('00', '01')
                ORDER BY status ASC, tasks.deadline ASC;
            """
        #取得したデータをリストでまとめる
        cur.execute(sql)
        rows = cur.fetchall()

        #使い終わったカーソル(作業員)と接続を切る
        cur.close()
        conn.close()

        print(rows) #中身ちゃんときてるか確認用

        #tasksを加工する(日付のフォーマットかえたり、そもそもidいらんからそれを渡さないようにしたり)
        tasks = [
            {
                "id": row[0],
                "status": row[7],
                "statuscode": row[1],
                "name": row[2],
                "deadline": row[3].isoformat() if row[3] else None,
                "completed_at": row[4].isoformat() if row[4] else None,
                "memo": row[5]
            }
            for row in rows
        ]
        statuslist = get_statusnumber()
        return jsonify({"tasks": tasks, "statuslist": statuslist}) #2つデータをとってきてそれを1つのjsonファイルに返して、fetchに渡してる
    
    except Exception as e:
         return jsonify({"error": f"接続失敗 : {str(e)}"}), 500
    
#ユーザーの登録したタスクをDBに追加する
#fetchでurlにアクセスあって、postのメソッドやったら以下の処理をするよ
@app.route('/add-task', methods=["POST"])
def add_task():
    #fetchから受け取ったJDONデータを取り出している。jsではtaskDataって箱で定義したけど、pythonは特にその指定をしなくてもbody内のjsonを撮ってきてくれる(get_jsonがその役割)
    data = request.get_json()
    print(data) #確認用

    #受け取ったjsonをSQLで渡す下準備
    #左側変数名を定義 = とってきたデータの中身
    status = data.get('status', '00') #ここがthmlから文字列でとってきてるから修正
    name = data.get('name', '')
    deadline = data.get('deadline', None)
    memo = data.get('memo', None)

    #SQL使ってDBに書き込む
    conn = get_connection()
    cur = conn.cursor()
    #tasks(status...)はdbのカラム名
    #values(status...)はさっき定義した変数
    cur.execute(
        "INSERT INTO tasks (status, name, deadline, memo) VALUES (%s, %s, %s, %s)",
        (status, name, deadline, memo)
        )

    #コミット=保存
    conn.commit() 

    cur.close()
    conn.close()

    #ターミナルで受け取ったデータを確認する
    print("受け取ったデータ:", data)
    ##fetchにできたでってレスポンスを返す
    return jsonify({"message":"登録成功", "data":data}),200

#ユーザーがタスクのステータスをプルダウンで更新した処理をSQLでupdateする処理
@app.route('/update-status/<int:task_id>', methods=["POST"])
def status_update(task_id):
    data = request.get_json()
    new_status = data.get("statuscode")

    #DB更新
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE tasks SET status = %s WHERE id =%s;", (new_status, task_id))
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "ステータス更新完了！"})

#削除ボタンが押されたときに論理削除を行う
@app.route('/delete-task/<int:task_id>', methods=["DELETE"])
def task_delete(task_id):
    #DB更新
    conn = get_connection()
    cur = conn.cursor()
    cur.execute('UPDATE tasks SET is_deleted = 1 WHERE id = %s;', (task_id,))
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "削除完了！"})