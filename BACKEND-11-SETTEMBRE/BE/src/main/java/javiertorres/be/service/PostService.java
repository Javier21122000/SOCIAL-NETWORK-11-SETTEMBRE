package javiertorres.be.service;

import javiertorres.be.model.*;
import javiertorres.be.repository.PostRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;

@Service
public class PostService {
    private static final Logger log = LoggerFactory.getLogger(PostService.class);
    private final PostRepository postRepository;
    private final Path uploadDirectory;
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;
    private static final int MAX_FILES = 5;
    private static final int MAX_CAPTION_LENGTH = 2200;
    private static final Set<String> PHOTO_TYPES = Set.of("image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif");
    private static final Set<String> DOCUMENT_TYPES = Set.of("application/pdf", "text/plain");
    private static final Set<String> PHOTO_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".heic", ".heif");
    private static final Set<String> DOCUMENT_EXTENSIONS = Set.of(".pdf", ".txt");

    public PostService(PostRepository postRepository, @Value("${app.upload-dir:uploads}") String uploadDirectory) {
        this.postRepository = postRepository;
        this.uploadDirectory = Paths.get(uploadDirectory).toAbsolutePath().normalize();
        try { Files.createDirectories(this.uploadDirectory); }
        catch (IOException exception) { throw new IllegalStateException("Impossibile creare la cartella upload", exception); }
    }

    private void handleFileUpload(Post post, String url, String contentType, String extension, String testoEstrattoOcr) {
        if (isPhoto(contentType, extension)) {
            Foto photo = new Foto();
            photo.setUrlFile(url);
            photo.setPost(post);
            post.getFoto().add(photo);
        } else {
            Documento document = new Documento();
            document.setUrlFile(url);
            document.setTestoEstrattoOcr(testoEstrattoOcr == null || testoEstrattoOcr.isBlank() ? null : testoEstrattoOcr.trim());
            document.setPost(post);
            post.getDocumenti().add(document);
        }
    }

    @Transactional(readOnly = true)
    public List<Post> findAll() { return postRepository.findAllNewestFirst(); }

    @Transactional(readOnly = true)
    public Post findById(UUID id) { return requirePost(id); }

    @Transactional
    public Post create(Post post) {
        validateAddress(post.getIndirizzo());
        post.setDidascalia(normalizedCaption(post.getDidascalia()));
        if (post.getCreatedAt() == null) post.setCreatedAt(Instant.now());
        // Le collezioni restano liste vuote invece di null: il JSON è coerente con la rotta multipart.
        if (post.getFoto() == null) post.setFoto(new ArrayList<>());
        if (post.getDocumenti() == null) post.setDocumenti(new ArrayList<>());
        post.getFoto().forEach(foto -> foto.setPost(post));
        post.getDocumenti().forEach(documento -> documento.setPost(post));
        return postRepository.save(post);
    }

    @Transactional
    public Post createMultipart(String didascalia, Indirizzo indirizzo, String testoEstrattoOcr, List<MultipartFile> files) {
        validateAddress(indirizzo);
        if (files == null || files.isEmpty() || files.size() > MAX_FILES) {
            throw new IllegalArgumentException("Sono richiesti da 1 a 5 file");
        }
        Post post = new Post();
        post.setDidascalia(normalizedCaption(didascalia));
        post.setIndirizzo(indirizzo);
        post.setCreatedAt(Instant.now());
        post.setFoto(new ArrayList<>());
        post.setDocumenti(new ArrayList<>());
        List<Path> writtenFiles = new ArrayList<>();
        try {
            for (MultipartFile file : files) {
                validateFile(file);
                String extension = safeExtension(file.getOriginalFilename());
                String contentType = normalizedContentType(file);
                String storedName = UUID.randomUUID() + extension;
                Path target = uploadDirectory.resolve(storedName).normalize();
                if (!target.getParent().equals(uploadDirectory)) throw new IllegalArgumentException("Nome file non valido");
                try (var input = file.getInputStream()) {
                    Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
                }
                writtenFiles.add(target);
                String url = "/uploads/" + storedName;
                handleFileUpload(post, url, contentType, extension, testoEstrattoOcr);
            }
            return postRepository.save(post);
        } catch (IOException | RuntimeException exception) {
            writtenFiles.forEach(path -> { try { Files.deleteIfExists(path); } catch (IOException ignored) { } });
            if (exception instanceof IllegalArgumentException illegalArgumentException) throw illegalArgumentException;
            throw new IllegalStateException("Impossibile salvare gli allegati", exception);
        }
    }

    @Transactional
    public Post updateDidascalia(UUID id, String didascalia) {
        Post post = requirePost(id);
        post.setDidascalia(normalizedCaption(didascalia));
        return postRepository.save(post);
    }

    @Transactional
    public void delete(UUID id) {
        Post post = requirePost(id);
        List<String> urls = new ArrayList<>();
        if (post.getFoto() != null) post.getFoto().forEach(photo -> urls.add(photo.getUrlFile()));
        if (post.getDocumenti() != null) post.getDocumenti().forEach(document -> urls.add(document.getUrlFile()));
        postRepository.delete(post);
        urls.forEach(this::deleteStoredFile);
    }

    private Post requirePost(UUID id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Post non trovato: " + id));
    }

    private String normalizedCaption(String didascalia) {
        String caption = didascalia == null ? "" : didascalia.trim();
        if (caption.length() > MAX_CAPTION_LENGTH) {
            throw new IllegalArgumentException("La didascalia può contenere al massimo " + MAX_CAPTION_LENGTH + " caratteri");
        }
        return caption;
    }

    private void validateAddress(Indirizzo address) {
        if (address == null || address.getLuogo() == null || address.getLuogo().isBlank()
                || address.getLatitudine() == null || !Double.isFinite(address.getLatitudine())
                || address.getLongitudine() == null || !Double.isFinite(address.getLongitudine())
                || Math.abs(address.getLatitudine()) > 90 || Math.abs(address.getLongitudine()) > 180) {
            throw new IllegalArgumentException("Indirizzo e coordinate non validi");
        }
        address.setLuogo(address.getLuogo().trim());
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Gli allegati non possono essere vuoti");
        if (file.getSize() > MAX_FILE_SIZE) throw new IllegalArgumentException("Ogni file deve essere al massimo 10 MB");
        String type = normalizedContentType(file);
        String extension = safeExtension(file.getOriginalFilename());
        if (!isPhoto(type, extension) && !isDocument(type, extension)) {
            throw new IllegalArgumentException("Formato non supportato: " + extension.replaceFirst("^\\.", "") + " (" + type + ")");
        }
    }

    /**
     * Alcuni browser inviano HEIC come application/octet-stream: in quel caso il tipo
     * viene ricavato dall'estensione, che resta comunque nella lista consentita.
     */
    private boolean isPhoto(String contentType, String extension) {
        if (!PHOTO_EXTENSIONS.contains(extension)) return false;
        return PHOTO_TYPES.contains(contentType) || isGenericType(contentType);
    }

    private boolean isDocument(String contentType, String extension) {
        if (!DOCUMENT_EXTENSIONS.contains(extension)) return false;
        return DOCUMENT_TYPES.contains(contentType) || isGenericType(contentType);
    }

    private boolean isGenericType(String contentType) {
        return contentType.isBlank() || "application/octet-stream".equals(contentType);
    }

    private String normalizedContentType(MultipartFile file) {
        return Optional.ofNullable(file.getContentType()).orElse("application/octet-stream").toLowerCase(Locale.ROOT);
    }

    private String safeExtension(String originalName) {
        if (originalName == null) return "";
        String cleanName = Paths.get(originalName).getFileName().toString();
        int dot = cleanName.lastIndexOf('.');
        return dot < 0 ? "" : cleanName.substring(dot).toLowerCase(Locale.ROOT);
    }

    /** Il post è già stato eliminato: un allegato residuo non deve far fallire la richiesta. */
    private void deleteStoredFile(String url) {
        if (url == null || !url.startsWith("/uploads/")) return;
        Path target = uploadDirectory.resolve(url.substring("/uploads/".length())).normalize();
        if (!target.getParent().equals(uploadDirectory)) return;
        try { Files.deleteIfExists(target); }
        catch (IOException exception) { log.warn("Allegato non rimosso dal disco: {}", target, exception); }
    }
}
