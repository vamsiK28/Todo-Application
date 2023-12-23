const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
var isValid = require("date-fns/isValid");
const format = require("date-fns/format");
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const checkParameterValidity = (request, response, next) => {
  const {
    priority = "",
    order_by = "id",
    status = "",
    category = "",
    date = "",
  } = request.query;
  if (priority !== "") {
    //console.log(5);
    if (priority !== "HIGH" && priority !== "LOW" && priority !== "MEDIUM") {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else {
      next();
    }
  } else if (status !== "") {
    // console.log(5);
    if (status !== "TO DO" && status !== "IN PROGRESS" && status !== "DONE") {
      response.status(400);
      response.send("Invalid Todo Status");
    } else {
      next();
    }
  } else if (category !== "") {
    if (category !== "WORK" && category !== "HOME" && category !== "LEARNING") {
      response.status(400);
      response.send("Invalid Todo Category");
    } else {
      next();
    }
  } else if (date !== "") {
    //console.log(4);
    let parts = date.split("-");
    //console.log(parts);
    let y = parseInt(parts[0]),
      m = parseInt(parts[1]),
      d = parseInt(parts[2]);
    let nd = new Date(y, m - 1, d);
    // console.log(y + "-" + m + "-" + d);
    //console.log(date + "  ++++  " + nd);
    // console.log(dueDate);
    if (isValid(new Date(y, m - 1, d))) {
      //console.log(dueDate);
      //console.log(122);
      let dueDate = format(nd, "yyyy-MM-dd");
      request.dueDateValue = dueDate;
      next();
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    next();
  }
};

app.get("/todos/", checkParameterValidity, async (request, response) => {
  const {
    status = "",
    priority = "",
    search_q = "",
    category = "",
  } = request.query;
  //console.log(status + " - " + priority);
  //console.log(2);
  const getTodosQuery = `
        SELECT id,todo,priority,status,category,due_date as dueDate FROM todo
        WHERE status like '%${status}%' 
        AND priority LIKE '%${priority}%'
        AND todo LIKE '%${search_q}%'
        AND category LIKE '%${category}%';
    `;
  const result = await db.all(getTodosQuery);
  response.send(result);
});

app.get(
  "/todos/:todoId/",
  checkParameterValidity,
  async (request, response) => {
    const { todoId } = request.params;
    const getTodoQuery = `
    SELECT id,todo,priority,status,category,
    due_date as dueDate
     FROM todo WHERE id=${todoId};
    `;
    const result = await db.get(getTodoQuery);
    response.send(result);
  }
);

app.get("/agenda/", checkParameterValidity, async (request, response) => {
  //console.log(request.dueDateValue);
  const getAgendaQuery = `
    select id,todo,priority,status,category,
    due_date as dueDate
    FROM todo where due_date like '${request.dueDateValue}';
    `;
  //console.log(getAgendaQuery);
  const result = await db.all(getAgendaQuery);
  response.send(result);
});

app.post("/todos/", checkParameterValidity, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const postTodoQuery = `
    INSERT INTO todo (id,todo,priority,status,category,due_date)
    VALUES (${id},'${todo}','${priority}','${status}','${category}','${dueDate}');
    `;
  const result = await db.get(postTodoQuery);
  response.send("Todo Successfully Added");
});

app.put(
  "/todos/:todoId/",
  checkParameterValidity,
  async (request, response) => {
    const { todoId } = request.params;
    const {
      status = "",
      priority = "",
      todo = "",
      category = "",
      dueDate = "",
    } = request.body;
    let updateField = null,
      updateValue = null;
    if (status !== "") {
      updateField = "status";
      updateValue = status;
    } else if (priority !== "") {
      updateField = "priority";
      updateValue = priority;
    } else if (todo !== "") {
      updateField = "todo";
      updateValue = todo;
    } else if (category !== "") {
      updateField = "category";
      updateValue = category;
    } else if (dueDate !== "") {
      updateField = "due_date";
      updateValue = dueDate;
    }
    const updateTodoQuery = `
    UPDATE todo
    SET ${updateField}='${updateValue}';
    `;
    const result = await db.run(updateTodoQuery);
    if (updateField === "due_date") updateField = "due Date";
    updateField = updateField.charAt(0).toUpperCase() + updateField.slice(1);
    response.send(`${updateField} Updated`);
  }
);

app.delete(
  "/todos/:todoId/",
  checkParameterValidity,
  async (request, response) => {
    const { todoId } = request.params;
    const deleteTodoQuery = `
    DELETE FROM todo WHERE id=${todoId};
    `;
    const result = await db.run(deleteTodoQuery);
    response.send("Todo Deleted");
  }
);

module.exports = app;
