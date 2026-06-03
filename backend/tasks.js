const { randomUUID } = require("crypto");
const {
  DynamoDBClient,
  ScanCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath;

    if (method === "OPTIONS") {
      return response(204);
    }

    if (method === "GET" && path === "/tasks") {
      return response(200, await listTasks());
    }

    if (method === "POST" && path === "/tasks") {
      const payload = JSON.parse(event.body || "{}");
      return response(201, await createTask(payload.title));
    }

    const taskId = event.pathParameters?.id;

    if (method === "PUT" && taskId) {
      const payload = JSON.parse(event.body || "{}");
      return response(200, await updateTask(taskId, payload.completed));
    }

    if (method === "DELETE" && taskId) {
      await deleteTask(taskId);
      return response(204);
    }

    return response(404, { message: "Rota nao encontrada." });
  } catch (error) {
    console.error(error);
    return response(error.statusCode || 500, {
      message: error.message || "Erro interno.",
    });
  }
};

async function listTasks() {
  const result = await dynamodb.send(
    new ScanCommand({
      TableName: TABLE_NAME,
    }),
  );

  return (result.Items || [])
    .map((item) => unmarshall(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function createTask(title) {
  if (!title || typeof title !== "string" || !title.trim()) {
    throw badRequest("Informe o titulo da tarefa.");
  }

  const task = {
    id: randomUUID(),
    title: title.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
  };

  await dynamodb.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(task),
    }),
  );

  return task;
}

async function updateTask(id, completed) {
  if (typeof completed !== "boolean") {
    throw badRequest("Informe completed como true ou false.");
  }

  const result = await dynamodb.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ id }),
      UpdateExpression: "SET completed = :completed",
      ExpressionAttributeValues: marshall({
        ":completed": completed,
      }),
      ReturnValues: "ALL_NEW",
    }),
  );

  return unmarshall(result.Attributes);
}

async function deleteTask(id) {
  await dynamodb.send(
    new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ id }),
    }),
  );
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Content-Type": "application/json",
    },
    body: body === undefined ? "" : JSON.stringify(body),
  };
}
