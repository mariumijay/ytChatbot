import streamlit as st

# Assuming you already have a function like this in your backend:
# def rag_chatbot(query: str) -> str:
#     # takes query, fetches relevant transcript chunks, runs LLM, returns answer
#     return response

# Streamlit UI
st.set_page_config(page_title="YouTube RAG Chatbot", page_icon="🎥", layout="centered")

st.title("🎥 YouTube Transcript Chatbot")
st.write("Ask anything about the video, and the bot will respond based on its transcript.")

# Sidebar for context
st.sidebar.header("Options")
st.sidebar.info("This bot is powered by your YouTube transcript + RAG magic.")

# Input field
user_query = st.text_input("Type your question here:")

if st.button("Ask"):
    if user_query.strip() == "":
        st.warning("Please type a question before clicking Ask.")
    else:
        with st.spinner("Thinking..."):
            # Call your chatbot function here
            response = rag_chatbot(user_query)  # <-- hook your backend here
        st.success("Bot's Response:")
        st.write(response)
