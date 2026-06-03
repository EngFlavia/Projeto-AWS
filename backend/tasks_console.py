import json
import os
import uuid
from datetime import datetime, timezone

import boto3


dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])


def lambda_handler(event, context):
    try:
        method = event["requestContext"]["http"]["method"]
        path = event.get("rawPath", "")

        if method == "OPTIONS":
            return response(204)

        if method == "GET" and path == "/tasks":
            return response(200, list_tasks())

        if method == "POST" and path == "/tasks":
            payload = json.loads(event.get("body") or "{}")
            return response(201, create_task(payload.get("title")))

        task_id = (event.get("pathParameters") or {}).get("id")

        if method == "PUT" and task_id:
            payload = json.loads(event.get("body") or "{}")
            return response(200, update_task(task_id, payload.get("completed")))

        if method == "DELETE" and task_id:
            delete_task(task_id)
            return response(204)

        return response(404, {"message": "Rota nao encontrada."})
    except ValueError as error:
        return response(400, {"message": str(error)})
    except Exception as error:
        print(error)
        return response(500, {"message": "Erro interno."})


def list_tasks():
    result = table.scan()
    tasks = result.get("Items", [])
    return sorted(tasks, key=lambda item: item["createdAt"], reverse=True)


def create_task(title):
    if not isinstance(title, str) or not title.strip():
        raise ValueError("Informe o titulo da tarefa.")

    task = {
        "id": str(uuid.uuid4()),
        "title": title.strip(),
        "completed": False,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    table.put_item(Item=task)
    return task


def update_task(task_id, completed):
    if not isinstance(completed, bool):
        raise ValueError("Informe completed como true ou false.")

    result = table.update_item(
        Key={"id": task_id},
        UpdateExpression="SET completed = :completed",
        ExpressionAttributeValues={":completed": completed},
        ReturnValues="ALL_NEW",
    )

    return result["Attributes"]


def delete_task(task_id):
    table.delete_item(Key={"id": task_id})


def response(status_code, body=None):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Content-Type": "application/json",
        },
        "body": "" if body is None else json.dumps(body),
    }
