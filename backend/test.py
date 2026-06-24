from pipeline import build_multi_pipeline

urls = [
    "https://www.youtube.com/watch?v=M8ICGx4p0lA",
    "https://www.youtube.com/watch?v=YcGXViwXItM"]

chain = build_multi_pipeline(urls)

chat_history = []

while True:
    question = input("You: ")
    if question.lower() in ["exit", "quit"]:
        break

    response = chain.invoke({
        "question": question,
        "chat_history": "\n".join(chat_history)
    })

    print(f"Bot: {response}")
    print("-" * 50)

    chat_history.append(f"You: {question}")
    chat_history.append(f"Bot: {response}")