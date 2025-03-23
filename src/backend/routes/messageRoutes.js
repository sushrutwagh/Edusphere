import express from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Student from "../models/Student.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Send a message (supports text & file)
// ✅ NEW UPDATED ROUTE
router.post("/send", authMiddleware, async (req, res) => {
  try {
    const { conversationId, content, file, receiver } = req.body;
    const sender = req.user.id;

    if (!conversationId || (!content?.trim() && !file)) {
      return res.status(400).json({ error: "Conversation ID and content or file required." });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const isGroup = conversation.isGroup;

    const newMessageData = {
      sender,
      content,
      file,
      conversationId,
      timestamp: new Date(),
      replyTo: req.body.replyTo || null,
    };

    // ✅ Only set receiver for 1-to-1
    if (!isGroup && receiver) {
      newMessageData.receiver = receiver;
    }

    const newMessage = new Message(newMessageData);
    await newMessage.save();
    await newMessage.populate([
      { path: "sender", select: "name email avatar" },
      {
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name email avatar",
        },
      },
    ]);
    // 1) **Populate** the sender right away
    await newMessage.populate("sender", "name email avatar");

    // 2) Then do your last‐message, unread‐counts, etc.
    conversation.lastMessage = {
      content: file ? "📎 Sent an attachment" : content,
      file,
      timestamp: newMessage.timestamp,
      _id: newMessage._id,
    };
    await conversation.save();
    conversation.participants.forEach((participantId) => {
      if (participantId.toString() !== sender.toString()) {
        const prev = conversation.unreadCounts.get(participantId.toString()) || 0;
        conversation.unreadCounts.set(participantId.toString(), prev + 1);
      }
    });
    conversation.participants.forEach((userId) => {
      req.io.to(userId.toString()).emit("newMessage", newMessage);
      req.io.to(userId.toString()).emit("conversationCreated", conversation);
    });

  

    await conversation.save();

    // ✅ Existing: Emit to each participant's userId room
    conversation.participants.forEach((userId) => {
      req.io.to(userId.toString()).emit("newMessage", newMessage);
      req.io.to(userId.toString()).emit("conversationCreated", conversation);
    });

    // ✅ ADDED: Also emit to the conversation's own room
    req.io.to(conversation._id.toString()).emit("newMessage", newMessage);
    req.io.to(conversation._id.toString()).emit("conversationCreated", conversation);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("❌ Error sending message:", error);
    res.status(500).json({ error: "Message sending failed", details: error.message });
  }
});

// ✅ Fetch conversations
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ Get conversations where the user is a participant
    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "name email role avatar")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    console.error("❌ Error fetching conversations:", error);
    res.status(500).json({ error: "Fetching conversations failed" });
  }
});

// ✅ Fetch messages for a conversation
router.get("/conversation/:conversationId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // ✅ Find the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    // ✅ Ensure user is a participant
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: "Not authorized to view this conversation" });
    }

    // ✅ Fetch messages for this conversation
    const messages = await Message.find({
      conversationId,
      isDeletedForEveryone: { $ne: true },
    })
      .populate("sender", "name avatar") // ✅ Populate the sender
      .populate("replyTo", "content sender") // ✅ Keep this for reply support
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "name avatar",
        },
      })
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error("❌ Error fetching conversation messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/createGroup", authMiddleware, async (req, res) => {
  try {
    const { groupName, classIds = [], individualUserIds = [] } = req.body;
    const creatorId = req.user.id;

    // 1) Gather all students from the selected classes
    const matchedStudents = await Student.find({ class: { $in: classIds } });
    // matchedStudents => array of Student docs (with _id, reg_id, etc.)

    // Next, find the User docs that reference those student _ids
    const matchedStudentUsers = await User.find({
      role: "student",
      profile: { $in: matchedStudents.map((s) => s._id) },
    });
    const classStudentIds = matchedStudentUsers.map((u) => u._id.toString());

    // 2) Filter out any user with role="admin" from the individually selected
    const validIndividuals = await User.find({
      _id: { $in: individualUserIds },
      role: { $ne: "admin" },
    });
    const individualIds = validIndividuals.map((u) => u._id.toString());

    // 3) Combine class-based students + individuals into a Set
    const combinedSet = new Set([...classStudentIds, ...individualIds]);

    // 4) If the creator is NOT role="admin", include them as well
    const creatorDoc = await User.findById(creatorId);
    if (creatorDoc && creatorDoc.role !== "admin") {
      combinedSet.add(creatorId);
    }

    // 5) Create new group conversation
    const newConversation = new Conversation({
      participants: Array.from(combinedSet),
      isGroup: true,
      groupName: groupName || "Untitled Group",
      groupAdmin: creatorDoc && creatorDoc.role !== "admin" ? creatorId : null,
    });
    await newConversation.save();

    // ✅ Existing: Emit to each participant's userId room
    newConversation.participants.forEach((userId) => {
      req.io.to(userId.toString()).emit("conversationCreated", newConversation);
    });

    // ✅ ADDED: Also emit to the conversation's own room
    req.io.to(newConversation._id.toString()).emit("conversationCreated", newConversation);

    return res.status(201).json(newConversation);
  } catch (error) {
    console.error("❌ Error creating group:", error);
    return res.status(500).json({ error: "Failed to create group" });
  }
});

router.post("/find-or-create", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { participantId } = req.body;

  if (!participantId) return res.status(400).json({ error: "Participant required" });

  // Find existing 1-1 conversation
  let convo = await Conversation.findOne({
    isGroup: false,
    participants: { $all: [userId, participantId], $size: 2 },
  });

  if (!convo) {
    convo = new Conversation({
      participants: [userId, participantId],
      isGroup: false,
    });
    await convo.save();
  }

  convo = await convo.populate("participants", "name email role avatar");
  res.json(convo);
});

// ✅ Edit a message (supports text only)
router.put("/edit/:id", authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    const updatedMessage = await Message.findByIdAndUpdate(
      req.params.id,
      { content },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Update lastMessage if needed
    const conversation = await Conversation.findById(updatedMessage.conversationId);
    if (
      conversation &&
      conversation.lastMessage &&
      String(conversation.lastMessage._id || "") === String(updatedMessage._id)
    ) {
      conversation.lastMessage.content = content;
      await conversation.save();
    }

    // ✅ ADDED: Also emit "messageEdited" to the conversation's room
    req.io.to(updatedMessage.conversationId.toString()).emit("messageEdited", updatedMessage);

    res.json(updatedMessage);
  } catch (error) {
    console.error("❌ Error editing message:", error);
    res.status(500).json({ error: "Message edit failed" });
  }
});

// ✅ Enhanced Emoji Reaction Logic
router.put("/react/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { emoji } = req.body;

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Check if user already reacted
    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId
    );

    if (existingIndex !== -1) {
      // User already reacted
      if (message.reactions[existingIndex].emoji === emoji) {
        // Same emoji → remove reaction
        message.reactions.splice(existingIndex, 1);
      } else {
        // Different emoji → update reaction
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      // New reaction
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();

    // ✅ Already conversation-based
    req.io.to(message.conversationId.toString()).emit("messageReacted", message);

    res.json(message);
  } catch (error) {
    console.error("❌ Reaction failed:", error);
    res.status(500).json({ error: "Failed to react" });
  }
});

// ✅ Delete a message
router.put("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { forEveryone } = req.body;

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (forEveryone) {
      // Only sender can delete for everyone
      if (message.sender.toString() !== userId) {
        return res.status(403).json({ error: "Only sender can delete for everyone." });
      }
      message.isDeletedForEveryone = true;
    } else {
      if (!message.deletedBy.includes(userId)) {
        message.deletedBy.push(userId);
      }
    }

    await message.save();

    // ✅ Already conversation-based
    req.io.to(message.conversationId.toString()).emit("messageDeleted", {
      id: message._id,
      forEveryone,
      userId,
    });

    res.json({ message: "Message updated with delete status." });
  } catch (error) {
    console.error("❌ Error deleting message:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
